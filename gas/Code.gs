/**
 * =============================================================================
 * AlgoMaze Lab - Graph Maze Benchmark (BFS vs DFS)
 * Google Apps Script (GAS) Backend
 * 파일명: Code.gs
 * =============================================================================
 */

/**
 * 0. Python 백엔드 서버 URL 및 연결 제어 (gas-python-startup-link 스킬 적용)
 */
function getPythonServerUrl_() {
  const url = PropertiesService.getScriptProperties().getProperty('PYTHON_SERVER_URL');
  return url ? url.trim() : '';
}

function connectPythonServer() {
  const baseUrl = getPythonServerUrl_();
  const startedAt = Date.now();

  if (!baseUrl) {
    return {
      connected: false,
      status: 'unconfigured',
      message: 'PYTHON_SERVER_URL 스크립트 속성이 설정되지 않았습니다.',
      latencyMs: 0
    };
  }

  try {
    const endpoint = baseUrl.replace(/\/+$/, '') + '/health';
    const res = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = res.getResponseCode();
    const latencyMs = Date.now() - startedAt;

    return {
      connected: code >= 200 && code < 300,
      status: code >= 200 && code < 300 ? 'connected' : 'error',
      httpStatus: code,
      message: code >= 200 && code < 300 ? 'Python 서버 연결됨' : ('응답 코드 ' + code),
      latencyMs: latencyMs
    };
  } catch (err) {
    return {
      connected: false,
      status: 'unreachable',
      message: err && err.message ? err.message : 'Python 서버 연결 실패',
      latencyMs: Date.now() - startedAt
    };
  }
}

function disconnectPythonServer() {
  return {
    connected: false,
    status: 'disconnected',
    message: 'Python 서버 연결이 끊어졌습니다.',
    latencyMs: 0
  };
}

/**
 * 1. 웹앱 진입점 (doGet)
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile("index");
  template.initialParam = e && e.parameter ? JSON.stringify(e.parameter) : "{}";

  return template
    .evaluate()
    .setTitle("AlgoMaze Lab | BFS vs DFS 미로 탈출 시각화")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 2. 미로 생성 알고리즘 (Randomized DFS with optional loop generation)
 * @param {number} rows - 행 수 (홀수 권장, 기본 15)
 * @param {number} cols - 열 수 (홀수 권장, 기본 15)
 * @param {number} loopRatio - 다중 경로 루프 비율 (기본 0.15)
 */
function generateMaze(rows, cols, loopRatio) {
  rows = rows || 15;
  cols = cols || 15;
  loopRatio = loopRatio !== undefined ? loopRatio : 0.15;

  var rCount = rows % 2 === 1 ? rows : rows + 1;
  var cCount = cols % 2 === 1 ? cols : cols + 1;

  // 전체를 벽(1)으로 초기화
  var grid = [];
  for (var r = 0; r < rCount; r++) {
    var row = [];
    for (var c = 0; c < cCount; c++) {
      row.push(1);
    }
    grid.push(row);
  }

  var start = [1, 1];
  var goal = [rCount - 2, cCount - 2];

  // DFS 기반 미로 파기
  var stack = [[1, 1]];
  grid[1][1] = 0;
  var visited = { "1,1": true };

  var directions = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2]
  ];

  while (stack.length > 0) {
    var curr = stack[stack.length - 1];
    var cr = curr[0];
    var cc = curr[1];
    var neighbors = [];

    for (var i = 0; i < directions.length; i++) {
      var dr = directions[i][0];
      var dc = directions[i][1];
      var nr = cr + dr;
      var nc = cc + dc;

      if (nr >= 1 && nr < rCount - 1 && nc >= 1 && nc < cCount - 1) {
        if (!visited[nr + "," + nc]) {
          neighbors.push([dr, dc, nr, nc]);
        }
      }
    }

    if (neighbors.length > 0) {
      var randIdx = Math.floor(Math.random() * neighbors.length);
      var chosen = neighbors[randIdx];
      var chDr = chosen[0];
      var chDc = chosen[1];
      var chNr = chosen[2];
      var chNc = chosen[3];

      grid[cr + chDr / 2][cc + chDc / 2] = 0;
      grid[chNr][chNc] = 0;
      visited[chNr + "," + chNc] = true;
      stack.push([chNr, chNc]);
    } else {
      stack.pop();
    }
  }

  // 다중 경로(루프) 형성을 위해 일부 내부 벽 제거
  var innerWalls = [];
  for (var r2 = 2; r2 < rCount - 2; r2++) {
    for (var c2 = 2; c2 < cCount - 2; c2++) {
      if (grid[r2][c2] === 1) {
        if (
          (grid[r2 - 1][c2] === 0 && grid[r2 + 1][c2] === 0) ||
          (grid[r2][c2 - 1] === 0 && grid[r2][c2 + 1] === 0)
        ) {
          innerWalls.push([r2, c2]);
        }
      }
    }
  }

  var numToRemove = Math.floor(innerWalls.length * loopRatio);
  for (var k = 0; k < numToRemove; k++) {
    if (innerWalls.length === 0) break;
    var wallIdx = Math.floor(Math.random() * innerWalls.length);
    var wall = innerWalls.splice(wallIdx, 1)[0];
    grid[wall[0]][wall[1]] = 0;
  }

  grid[start[0]][start[1]] = 0;
  grid[goal[0]][goal[1]] = 0;

  return {
    rows: rCount,
    cols: cCount,
    grid: grid,
    start: start,
    goal: goal
  };
}

/**
 * 3. 미로 풀이 및 단계별 히스토그램/메타데이터 생성 (BFS & DFS)
 */
function solveMaze(grid, start, goal, algorithm) {
  algorithm = algorithm || "both";
  var result = {
    start: start,
    goal: goal
  };

  if (algorithm === "bfs" || algorithm === "both") {
    result.bfs = runBfsTrace(grid, start, goal);
  }
  if (algorithm === "dfs" || algorithm === "both") {
    result.dfs = runDfsTrace(grid, start, goal);
  }

  if (algorithm === "both" && result.bfs && result.dfs) {
    var bfsRes = result.bfs;
    var dfsRes = result.dfs;
    result.comparison = {
      pathLengthDiff: dfsRes.pathLength - bfsRes.pathLength,
      visitedDiff: dfsRes.totalVisited - bfsRes.totalVisited,
      totalStepsDiff: dfsRes.totalSteps - bfsRes.totalSteps,
      summaryComment:
        "BFS는 총 " +
        bfsRes.totalVisited +
        "개 노드를 탐색하여 최단 경로(길이 " +
        bfsRes.pathLength +
        ")를 확정했습니다. " +
        "반면 DFS는 총 " +
        dfsRes.totalVisited +
        "개 노드를 탐색하여 경로(길이 " +
        dfsRes.pathLength +
        ")를 발견했습니다."
    };
  }

  return result;
}

/**
 * BFS 알고리즘 단계별 트레이스
 */
function runBfsTrace(grid, start, goal) {
  var rows = grid.length;
  var cols = grid[0].length;
  var sr = start[0];
  var sc = start[1];
  var gr = goal[0];
  var gc = goal[1];

  var totalOpen = 0;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      if (grid[r][c] === 0) totalOpen++;
    }
  }

  var queue = [[sr, sc]];
  var visitedMap = {};
  visitedMap[sr + "," + sc] = true;
  var parent = {};
  var depthMap = {};
  depthMap[sr + "," + sc] = 0;

  var steps = [];
  var directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
  ];
  var stepNum = 0;
  var pathFound = false;
  var maxFrontier = 1;
  var visitedList = [[sr, sc]];

  steps.push({
    step: stepNum,
    current: [sr, sc],
    frontier: [[sr, sc]],
    visited: [[sr, sc]],
    visited_count: 1,
    frontier_count: 1,
    path_found: false,
    histogram: {
      depth_distribution: { "0": 1 },
      frontier_size: 1,
      cell_status: {
        unvisited: totalOpen - 1,
        frontier: 1,
        visited: 1,
        wall: rows * cols - totalOpen
      }
    },
    metadata: {
      step_time_ms: 0,
      data_structure: "Queue (FIFO)",
      time_complexity_state: {
        notation: "O(V + E)",
        explored_nodes_V: 1,
        progress_percent: Number(((1 / totalOpen) * 100).toFixed(1))
      },
      space_complexity_state: {
        notation: "O(V)",
        current_frontier_size: 1,
        max_frontier_size: 1
      },
      description: "BFS 시작: 출발점을 FIFO Queue에 삽입합니다."
    }
  });

  while (queue.length > 0) {
    stepNum++;
    var curr = queue.shift();
    var cr = curr[0];
    var cc = curr[1];
    var curDepth = depthMap[cr + "," + cc];

    if (cr === gr && cc === gc) {
      pathFound = true;
      steps.push({
        step: stepNum,
        current: [cr, cc],
        frontier: queue.slice(0, 15),
        visited: visitedList.slice(0),
        visited_count: visitedList.length,
        frontier_count: queue.length,
        path_found: true,
        histogram: {
          depth_distribution: buildDepthHist(depthMap),
          frontier_size: queue.length,
          cell_status: {
            unvisited: Math.max(0, totalOpen - visitedList.length),
            frontier: queue.length,
            visited: visitedList.length,
            wall: rows * cols - totalOpen
          }
        },
        metadata: {
          step_time_ms: stepNum * 0.15,
          data_structure: "Queue (FIFO)",
          time_complexity_state: {
            notation: "O(V + E)",
            explored_nodes_V: visitedList.length,
            progress_percent: Number(
              ((visitedList.length / totalOpen) * 100).toFixed(1)
            )
          },
          space_complexity_state: {
            notation: "O(V)",
            current_frontier_size: queue.length,
            max_frontier_size: maxFrontier
          },
          description: "목표점에 도달했습니다! BFS 최단 경로가 확정되었습니다."
        }
      });
      break;
    }

    var newlyAdded = 0;
    for (var i = 0; i < directions.length; i++) {
      var nr = cr + directions[i][0];
      var nc = cc + directions[i][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        var key = nr + "," + nc;
        if (!visitedMap[key]) {
          visitedMap[key] = true;
          parent[key] = [cr, cc];
          depthMap[key] = curDepth + 1;
          queue.push([nr, nc]);
          visitedList.push([nr, nc]);
          newlyAdded++;
        }
      }
    }

    maxFrontier = Math.max(maxFrontier, queue.length);

    steps.push({
      step: stepNum,
      current: [cr, cc],
      frontier: queue.slice(0, 15),
      visited: visitedList.slice(0),
      visited_count: visitedList.length,
      frontier_count: queue.length,
      path_found: false,
      histogram: {
        depth_distribution: buildDepthHist(depthMap),
        frontier_size: queue.length,
        cell_status: {
          unvisited: Math.max(0, totalOpen - visitedList.length),
          frontier: queue.length,
          visited: visitedList.length,
          wall: rows * cols - totalOpen
        }
      },
      metadata: {
        step_time_ms: stepNum * 0.15,
        data_structure: "Queue (FIFO)",
        time_complexity_state: {
          notation: "O(V + E)",
          explored_nodes_V: visitedList.length,
          progress_percent: Number(
            ((visitedList.length / totalOpen) * 100).toFixed(1)
          )
        },
        space_complexity_state: {
          notation: "O(V)",
          current_frontier_size: queue.length,
          max_frontier_size: maxFrontier
        },
        description:
          "Queue에서 [" +
          cr +
          "," +
          cc +
          "]를 꺼내고 이웃 " +
          newlyAdded +
          "개 노드를 Enqueue했습니다."
      }
    });
  }

  var finalPath = [];
  if (pathFound) {
    var curPos = [gr, gc];
    while (curPos[0] !== sr || curPos[1] !== sc) {
      finalPath.push(curPos);
      curPos = parent[curPos[0] + "," + curPos[1]];
    }
    finalPath.push([sr, sc]);
    finalPath.reverse();
  }

  return {
    algorithm: "BFS",
    dataStructure: "Queue (FIFO)",
    pathFound: pathFound,
    finalPath: finalPath,
    pathLength: finalPath.length,
    totalVisited: visitedList.length,
    totalSteps: steps.length,
    maxFrontierSize: maxFrontier,
    steps: steps
  };
}

/**
 * DFS 알고리즘 단계별 트레이스
 */
function runDfsTrace(grid, start, goal) {
  var rows = grid.length;
  var cols = grid[0].length;
  var sr = start[0];
  var sc = start[1];
  var gr = goal[0];
  var gc = goal[1];

  var totalOpen = 0;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      if (grid[r][c] === 0) totalOpen++;
    }
  }

  var stack = [[sr, sc, 0]];
  var visitedMap = {};
  visitedMap[sr + "," + sc] = true;
  var parent = {};
  var depthMap = {};
  depthMap[sr + "," + sc] = 0;

  var steps = [];
  var directions = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
  ];
  var stepNum = 0;
  var pathFound = false;
  var maxFrontier = 1;
  var visitedList = [[sr, sc]];

  steps.push({
    step: stepNum,
    current: [sr, sc],
    frontier: [[sr, sc]],
    visited: [[sr, sc]],
    visited_count: 1,
    frontier_count: 1,
    path_found: false,
    histogram: {
      depth_distribution: { "0": 1 },
      frontier_size: 1,
      cell_status: {
        unvisited: totalOpen - 1,
        frontier: 1,
        visited: 1,
        wall: rows * cols - totalOpen
      }
    },
    metadata: {
      step_time_ms: 0,
      data_structure: "Stack (LIFO)",
      time_complexity_state: {
        notation: "O(V + E)",
        explored_nodes_V: 1,
        progress_percent: Number(((1 / totalOpen) * 100).toFixed(1))
      },
      space_complexity_state: {
        notation: "O(H) <= O(V)",
        current_frontier_size: 1,
        max_frontier_size: 1
      },
      description: "DFS 시작: 출발점을 LIFO Stack에 푸시(Push)합니다."
    }
  });

  while (stack.length > 0) {
    stepNum++;
    var curr = stack.pop();
    var cr = curr[0];
    var cc = curr[1];
    var curDepth = curr[2];

    if (cr === gr && cc === gc) {
      pathFound = true;
      steps.push({
        step: stepNum,
        current: [cr, cc],
        frontier: stack.slice(0, 15).map(function (it) {
          return [it[0], it[1]];
        }),
        visited: visitedList.slice(0),
        visited_count: visitedList.length,
        frontier_count: stack.length,
        path_found: true,
        histogram: {
          depth_distribution: buildDepthHist(depthMap),
          frontier_size: stack.length,
          cell_status: {
            unvisited: Math.max(0, totalOpen - visitedList.length),
            frontier: stack.length,
            visited: visitedList.length,
            wall: rows * cols - totalOpen
          }
        },
        metadata: {
          step_time_ms: stepNum * 0.15,
          data_structure: "Stack (LIFO)",
          time_complexity_state: {
            notation: "O(V + E)",
            explored_nodes_V: visitedList.length,
            progress_percent: Number(
              ((visitedList.length / totalOpen) * 100).toFixed(1)
            )
          },
          space_complexity_state: {
            notation: "O(H) <= O(V)",
            current_frontier_size: stack.length,
            max_frontier_size: maxFrontier
          },
          description:
            "목표점에 도달했습니다! DFS는 첫 경로를 찾지만 우회할 수 있습니다."
        }
      });
      break;
    }

    var newlyAdded = 0;
    for (var i = directions.length - 1; i >= 0; i--) {
      var nr = cr + directions[i][0];
      var nc = cc + directions[i][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        var key = nr + "," + nc;
        if (!visitedMap[key]) {
          visitedMap[key] = true;
          parent[key] = [cr, cc];
          depthMap[key] = curDepth + 1;
          stack.push([nr, nc, curDepth + 1]);
          visitedList.push([nr, nc]);
          newlyAdded++;
        }
      }
    }

    maxFrontier = Math.max(maxFrontier, stack.length);

    steps.push({
      step: stepNum,
      current: [cr, cc],
      frontier: stack.slice(0, 15).map(function (it) {
        return [it[0], it[1]];
      }),
      visited: visitedList.slice(0),
      visited_count: visitedList.length,
      frontier_count: stack.length,
      path_found: false,
      histogram: {
        depth_distribution: buildDepthHist(depthMap),
        frontier_size: stack.length,
        cell_status: {
          unvisited: Math.max(0, totalOpen - visitedList.length),
          frontier: stack.length,
          visited: visitedList.length,
          wall: rows * cols - totalOpen
        }
      },
      metadata: {
        step_time_ms: stepNum * 0.15,
        data_structure: "Stack (LIFO)",
        time_complexity_state: {
          notation: "O(V + E)",
          explored_nodes_V: visitedList.length,
          progress_percent: Number(
            ((visitedList.length / totalOpen) * 100).toFixed(1)
          )
        },
        space_complexity_state: {
          notation: "O(H) <= O(V)",
          current_frontier_size: stack.length,
          max_frontier_size: maxFrontier
        },
        description:
          newlyAdded > 0
            ? "Stack에서 Pop 후 분기 " + newlyAdded + "개를 Push했습니다."
            : "막다른 길 도달! 이전 분기점으로 백트래킹(Backtracking)합니다."
      }
    });
  }

  var finalPath = [];
  if (pathFound) {
    var curPos = [gr, gc];
    while (curPos[0] !== sr || curPos[1] !== sc) {
      finalPath.push(curPos);
      curPos = parent[curPos[0] + "," + curPos[1]];
    }
    finalPath.push([sr, sc]);
    finalPath.reverse();
  }

  return {
    algorithm: "DFS",
    dataStructure: "Stack (LIFO)",
    pathFound: pathFound,
    finalPath: finalPath,
    pathLength: finalPath.length,
    totalVisited: visitedList.length,
    totalSteps: steps.length,
    maxFrontierSize: maxFrontier,
    steps: steps
  };
}

function buildDepthHist(depthMap) {
  var counts = {};
  for (var k in depthMap) {
    var d = depthMap[k];
    var bin = Math.floor(d / 3) * 3;
    var label = bin + "~" + (bin + 2);
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

/**
 * 4. 초기 렌더링용 빈 상태 (Empty State) 기본 구조
 * (gas-empty-initial-state 스킬 준수: 초기 더미/샘플/목업 미로 데이터를 반환하지 않음)
 */
function getDefaultBenchmark() {
  return {
    rows: 15,
    cols: 15,
    grid: [],
    start: [1, 1],
    goal: [13, 13],
    bfs: null,
    dfs: null,
    comparison: null,
    empty: true,
    message: "미로를 생성하거나 탐색을 실행하면 결과가 표시됩니다."
  };
}
