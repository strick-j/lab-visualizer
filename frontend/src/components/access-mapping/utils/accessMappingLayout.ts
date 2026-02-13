/**
 * Layout calculator for access mapping visualization.
 *
 * Creates a left-to-right columnar layout:
 * Col 0: Users → Col 1: Roles → Col 2: Safes/SIA Policies → Col 3: Accounts → Col 4: Targets
 *
 * Supports collapsible nodes. When a node is collapsed, its outgoing edges
 * are hidden and any downstream nodes that become unreachable are also hidden.
 * Shared nodes (e.g., a role used by two users) remain visible as long as at
 * least one incoming edge is still visible.
 */

import type { Node, Edge } from "reactflow";
import type { AccessMappingResponse, AccessNodeChildSummary } from "@/types";

const COLUMN_SPACING = 360;
const ROW_SPACING = 100;
const NODE_WIDTH = 280;
const START_X = 50;
const START_Y = 50;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Determine the column index for an entity type
 */
function entityColumn(entityType: string): number {
  switch (entityType) {
    case "role":
      return 1;
    case "safe":
    case "sia_policy":
      return 2;
    case "account":
      return 3;
    default:
      return -1;
  }
}

/**
 * Map entity type to React Flow node type
 */
function entityNodeType(entityType: string): string {
  switch (entityType) {
    case "role":
      return "access-role";
    case "safe":
      return "access-safe";
    case "account":
      return "access-account";
    case "sia_policy":
      return "access-sia-policy";
    default:
      return "";
  }
}

/**
 * Build node data for an entity type
 */
function entityNodeData(
  entityType: string,
  entityName: string,
  context?: Record<string, unknown> | null,
): Record<string, unknown> {
  switch (entityType) {
    case "role":
      return { label: entityName, roleName: entityName };
    case "safe":
      return { label: entityName, safeName: entityName };
    case "account": {
      const data: Record<string, unknown> = {
        label: entityName,
        accountName: entityName,
      };
      if (context?.platform_id) data.platformId = context.platform_id;
      if (context?.username) data.username = context.username;
      if (context?.secret_type) data.secretType = context.secret_type;
      if (context?.address) data.address = context.address;
      return data;
    }
    case "sia_policy":
      return { label: entityName, policyName: entityName };
    default:
      return { label: entityName };
  }
}

/**
 * Seen set for a given entity type
 */
function getSeenSet(
  entityType: string,
  seenSets: {
    roles: Set<string>;
    safes: Set<string>;
    accounts: Set<string>;
    policies: Set<string>;
  },
): Set<string> {
  switch (entityType) {
    case "role":
      return seenSets.roles;
    case "safe":
      return seenSets.safes;
    case "account":
      return seenSets.accounts;
    case "sia_policy":
      return seenSets.policies;
    default:
      return new Set();
  }
}

/**
 * Map entity type to a node ID prefix
 */
function entityNodeId(entityType: string, entityId: string): string {
  switch (entityType) {
    case "role":
      return `role-${entityId}`;
    case "safe":
      return `safe-${entityId}`;
    case "account":
      return `account-${entityId}`;
    case "sia_policy":
      return `policy-${entityId}`;
    default:
      return `${entityType}-${entityId}`;
  }
}

/**
 * Process the steps of an access path, creating intermediate nodes and edges.
 * If targetId is null, the path ends at the last step (relationship-only).
 */
function processPathSteps(
  path: {
    access_type: string;
    steps: {
      entity_type: string;
      entity_id: string;
      entity_name: string;
      context?: Record<string, unknown> | null;
    }[];
  },
  userId: string,
  nodes: Node[],
  edges: Edge[],
  colY: number[],
  seenSets: {
    roles: Set<string>;
    safes: Set<string>;
    accounts: Set<string>;
    policies: Set<string>;
  },
  targetId: string | null,
): void {
  const isStanding = path.access_type === "standing";
  const edgeStyle = isStanding
    ? { stroke: "#3b82f6", strokeWidth: 2 }
    : { stroke: "#f97316", strokeWidth: 2, strokeDasharray: "5 5" };

  let prevNodeId = userId;

  for (const step of path.steps) {
    const column = entityColumn(step.entity_type);
    if (column === -1) continue;

    const nodeId = entityNodeId(step.entity_type, step.entity_id);
    const nodeType = entityNodeType(step.entity_type);
    const nodeData = entityNodeData(
      step.entity_type,
      step.entity_name,
      step.context,
    );
    const seenSet = getSeenSet(step.entity_type, seenSets);

    // Add the intermediate node if not already added
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

  // Connect last step to target (only when a target exists)
  if (targetId) {
    const finalEdgeId = `${prevNodeId}->${targetId}`;
    if (!edges.find((e) => e.id === finalEdgeId)) {
      edges.push({
        id: finalEdgeId,
        source: prevNodeId,
        target: targetId,
        style: edgeStyle,
        animated: path.access_type !== "standing",
      });
    }
  }
}

/**
 * Compute child summary for a collapsed node by traversing its outgoing edges
 */
function computeChildSummary(
  nodeId: string,
  edges: Edge[],
  nodes: Node[],
): AccessNodeChildSummary {
  const summary: AccessNodeChildSummary = {};
  const visited = new Set<string>();
  const queue = [nodeId];

  // BFS from the collapsed node through outgoing edges
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const outgoing = edges.filter((e) => e.source === currentId);

    for (const edge of outgoing) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);

      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!targetNode) continue;

      switch (targetNode.type) {
        case "access-role":
          summary.roleCount = (summary.roleCount || 0) + 1;
          break;
        case "access-safe":
          summary.safeCount = (summary.safeCount || 0) + 1;
          break;
        case "access-sia-policy":
          summary.policyCount = (summary.policyCount || 0) + 1;
          break;
        case "access-account":
          summary.accountCount = (summary.accountCount || 0) + 1;
          break;
        case "access-ec2-target":
        case "access-rds-target":
          summary.targetCount = (summary.targetCount || 0) + 1;
          break;
      }

      // Count standing vs JIT from edge styles
      if (
        targetNode.type === "access-ec2-target" ||
        targetNode.type === "access-rds-target"
      ) {
        if (edge.animated) {
          summary.jitCount = (summary.jitCount || 0) + 1;
        } else {
          summary.standingCount = (summary.standingCount || 0) + 1;
        }
      }

      // Continue BFS downstream
      queue.push(edge.target);
    }
  }

  return summary;
}

/**
 * Apply collapse logic: hide outgoing edges from collapsed nodes,
 * then hide any nodes that become unreachable.
 */
function applyCollapseState(
  nodes: Node[],
  edges: Edge[],
  collapsedNodeIds: Set<string>,
): void {
  // User nodes are root nodes - always visible
  const rootNodeTypes = new Set(["access-user"]);

  // Step 1: Compute child summaries and mark collapsed nodes
  for (const node of nodes) {
    if (collapsedNodeIds.has(node.id)) {
      node.data = {
        ...node.data,
        collapsed: true,
        childSummary: computeChildSummary(node.id, edges, nodes),
      };
    }
  }

  // Step 2: Hide outgoing edges from collapsed nodes
  for (const edge of edges) {
    if (collapsedNodeIds.has(edge.source)) {
      edge.hidden = true;
    }
  }

  // Step 3: Fixed-point iteration - hide nodes with no visible incoming edges
  // Root nodes (users) are always visible. Non-root nodes need at least
  // one visible incoming edge to remain visible.
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.hidden) continue;
      if (rootNodeTypes.has(node.type || "")) continue;

      const hasVisibleIncoming = edges.some(
        (e) => e.target === node.id && !e.hidden,
      );

      if (!hasVisibleIncoming) {
        node.hidden = true;
        // Also hide all outgoing edges from this now-hidden node
        for (const edge of edges) {
          if (edge.source === node.id && !edge.hidden) {
            edge.hidden = true;
            changed = true;
          }
        }
        changed = true;
      }
    }
  }
}

export function calculateAccessMappingLayout(
  data: AccessMappingResponse,
  filters?: { accessType?: string; selectedUser?: string },
  collapsedNodeIds?: Set<string>,
): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Track unique entities to avoid duplicates
  const seenUsers = new Set<string>();
  const seenTargets = new Set<string>();
  const seenSets = {
    roles: new Set<string>(),
    safes: new Set<string>(),
    accounts: new Set<string>(),
    policies: new Set<string>(),
  };

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
          target.target_type === "ec2"
            ? "access-ec2-target"
            : "access-rds-target";
        const targetData =
          target.target_type === "ec2"
            ? {
                label: target.target_name || target.target_id,
                instanceId: target.target_id,
                privateIp: target.target_address,
                displayStatus: target.display_status,
                instanceType: target.instance_type,
                vpcId: target.vpc_id,
              }
            : {
                label: target.target_name || target.target_id,
                dbIdentifier: target.target_id,
                endpoint: target.target_address,
                displayStatus: target.display_status,
                instanceClass: target.instance_type,
                engine: target.engine,
                vpcId: target.vpc_id,
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

        processPathSteps(path, userId, nodes, edges, colY, seenSets, targetId);
      }
    }

    // Process relationship-only paths (no target at the end)
    const relationshipPaths = userMapping.access_paths || [];
    for (const path of relationshipPaths) {
      if (filters?.accessType && path.access_type !== filters.accessType) {
        continue;
      }

      processPathSteps(path, userId, nodes, edges, colY, seenSets, null);
    }
  }

  // Apply collapse state (hides edges and unreachable nodes)
  if (collapsedNodeIds && collapsedNodeIds.size > 0) {
    applyCollapseState(nodes, edges, collapsedNodeIds);
  }

  // Center columns vertically (only visible nodes)
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
  const columnNodes = nodes.filter(
    (n) => typeArr.includes(n.type || "") && !n.hidden,
  );
  if (columnNodes.length === 0) return;

  const totalHeight = (columnNodes.length - 1) * ROW_SPACING;
  const startY = Math.max(START_Y, (600 - totalHeight) / 2);

  columnNodes.forEach((node, i) => {
    node.position.y = startY + i * ROW_SPACING;
  });
}

export { NODE_WIDTH, COLUMN_SPACING };
