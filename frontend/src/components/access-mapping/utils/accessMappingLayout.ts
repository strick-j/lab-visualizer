/**
 * Layout calculator for access mapping visualization.
 *
 * Creates a left-to-right columnar layout:
 * Col 1: Users → Col 2: Roles → Col 3: Safes/SIA Policies → Col 4: Accounts → Col 5: Targets
 */

import type { Node, Edge } from "reactflow";
import type { AccessMappingResponse } from "@/types";

const COLUMN_SPACING = 280;
const ROW_SPACING = 100;
const NODE_WIDTH = 170;
const START_X = 50;
const START_Y = 50;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export function calculateAccessMappingLayout(
  data: AccessMappingResponse,
  filters?: { accessType?: string; selectedUser?: string },
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Track unique entities to avoid duplicates
  const seenUsers = new Set<string>();
  const seenRoles = new Set<string>();
  const seenSafes = new Set<string>();
  const seenAccounts = new Set<string>();
  const seenPolicies = new Set<string>();
  const seenTargets = new Set<string>();

  // Column position trackers (y offset for each column)
  const colY = [START_Y, START_Y, START_Y, START_Y, START_Y];

  // Filter users if selectedUser is set
  const users = filters?.selectedUser
    ? data.users.filter((u) => u.user_name === filters.selectedUser)
    : data.users;

  for (const userMapping of users) {
    // Add user node
    const userId = `user-${userMapping.user_name}`;
    if (!seenUsers.has(userMapping.user_name)) {
      seenUsers.add(userMapping.user_name);
      nodes.push({
        id: userId,
        type: "access-user",
        position: { x: START_X, y: colY[0] },
        data: { label: userMapping.user_name, userName: userMapping.user_name },
      });
      colY[0] += ROW_SPACING;
    }

    for (const target of userMapping.targets) {
      // Add target node
      const targetId = `target-${target.target_type}-${target.target_id}`;
      if (!seenTargets.has(targetId)) {
        seenTargets.add(targetId);
        const targetType =
          target.target_type === "ec2" ? "access-ec2-target" : "access-rds-target";
        const targetData =
          target.target_type === "ec2"
            ? {
                label: target.target_name || target.target_id,
                instanceId: target.target_id,
                privateIp: target.target_address,
                displayStatus: target.display_status,
              }
            : {
                label: target.target_name || target.target_id,
                dbIdentifier: target.target_id,
                endpoint: target.target_address,
                displayStatus: target.display_status,
              };
        nodes.push({
          id: targetId,
          type: targetType,
          position: { x: START_X + COLUMN_SPACING * 4, y: colY[4] },
          data: targetData,
        });
        colY[4] += ROW_SPACING;
      }

      for (const path of target.access_paths) {
        // Filter by access type
        if (filters?.accessType && path.access_type !== filters.accessType) {
          continue;
        }

        const isStanding = path.access_type === "standing";
        const edgeStyle = isStanding
          ? { stroke: "#3b82f6", strokeWidth: 2 }
          : { stroke: "#f97316", strokeWidth: 2, strokeDasharray: "5 5" };

        // Process each step in the path to create intermediate nodes and edges
        let prevNodeId = userId;

        for (const step of path.steps) {
          let nodeId = "";
          let nodeType = "";
          let nodeData: Record<string, unknown> = {};
          let column = 0;

          switch (step.entity_type) {
            case "role":
              nodeId = `role-${step.entity_id}`;
              nodeType = "access-role";
              nodeData = { label: step.entity_name, roleName: step.entity_name };
              column = 1;
              break;
            case "safe":
              nodeId = `safe-${step.entity_id}`;
              nodeType = "access-safe";
              nodeData = {
                label: step.entity_name,
                safeName: step.entity_name,
              };
              column = 2;
              break;
            case "account":
              nodeId = `account-${step.entity_id}`;
              nodeType = "access-account";
              nodeData = {
                label: step.entity_name,
                accountName: step.entity_name,
              };
              column = 3;
              break;
            case "sia_policy":
              nodeId = `policy-${step.entity_id}`;
              nodeType = "access-sia-policy";
              nodeData = {
                label: step.entity_name,
                policyName: step.entity_name,
              };
              column = 2;
              break;
            default:
              continue;
          }

          // Add the intermediate node if not already added
          const seenSet =
            step.entity_type === "role"
              ? seenRoles
              : step.entity_type === "safe"
                ? seenSafes
                : step.entity_type === "account"
                  ? seenAccounts
                  : seenPolicies;

          if (!seenSet.has(step.entity_id)) {
            seenSet.add(step.entity_id);
            nodes.push({
              id: nodeId,
              type: nodeType,
              position: {
                x: START_X + COLUMN_SPACING * column,
                y: colY[column],
              },
              data: nodeData,
            });
            colY[column] += ROW_SPACING;
          }

          // Create edge from previous node
          const edgeId = `${prevNodeId}->${nodeId}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: prevNodeId,
              target: nodeId,
              style: edgeStyle,
              animated: !isStanding,
            });
          }

          prevNodeId = nodeId;
        }

        // Connect last step to target
        const finalEdgeId = `${prevNodeId}->${targetId}`;
        if (!edges.find((e) => e.id === finalEdgeId)) {
          edges.push({
            id: finalEdgeId,
            source: prevNodeId,
            target: targetId,
            style: edgeStyle,
            animated: !isStanding,
          });
        }
      }
    }
  }

  // Center columns vertically
  centerColumn(nodes, "access-user", START_X);
  centerColumn(nodes, "access-role", START_X + COLUMN_SPACING);
  centerColumn(
    nodes,
    ["access-safe", "access-sia-policy"],
    START_X + COLUMN_SPACING * 2,
  );
  centerColumn(nodes, "access-account", START_X + COLUMN_SPACING * 3);
  centerColumn(
    nodes,
    ["access-ec2-target", "access-rds-target"],
    START_X + COLUMN_SPACING * 4,
  );

  return { nodes, edges };
}

function centerColumn(
  nodes: Node[],
  types: string | string[],
  _x: number,
): void {
  const typeArr = Array.isArray(types) ? types : [types];
  const columnNodes = nodes.filter((n) => typeArr.includes(n.type || ""));
  if (columnNodes.length === 0) return;

  const totalHeight = (columnNodes.length - 1) * ROW_SPACING;
  const startY = Math.max(START_Y, (600 - totalHeight) / 2);

  columnNodes.forEach((node, i) => {
    node.position.y = startY + i * ROW_SPACING;
  });
}

export { NODE_WIDTH, COLUMN_SPACING };
