/**
 * AlgoMaze Lab - Graph Maze Benchmark (BFS vs DFS)
 * Google Apps Script WebApp Backend
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile("index");
  return template
    .evaluate()
    .setTitle("AlgoMaze Lab - BFS vs DFS Visualizer")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 미로 생성 및 탐색 시뮬레이션용 백엔드 유틸리티 함수
 */
function getBenchmarkStats() {
  return {
    bfs: {
      algorithm: "Breadth-First Search",
      dataStructure: "Queue (FIFO)",
      optimality: "Guaranteed Shortest Path",
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V)",
      visitedNodes: 184,
      pathLength: 42
    },
    dfs: {
      algorithm: "Depth-First Search",
      dataStructure: "Stack / Recursion (LIFO)",
      optimality: "Not Guaranteed",
      timeComplexity: "O(V + E)",
      spaceComplexity: "O(V) (Max Depth)",
      visitedNodes: 312,
      pathLength: 78
    }
  };
}
