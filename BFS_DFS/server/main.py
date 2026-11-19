import time
import random
from collections import deque
from typing import List, Tuple, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="AlgoMaze Lab - BFS vs DFS Visualizer API",
    description="너비 우선 탐색(BFS)과 깊이 우선 탐색(DFS) 미로 탈출 알고리즘 시각화 및 단계별 히스토그램/메타데이터 생성 서버",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# Pydantic 데이터 모델
# ==============================================================================

class MazeGenerateRequest(BaseModel):
    rows: int = Field(default=15, ge=7, le=35, description="미로 행 수 (홀수 권장)")
    cols: int = Field(default=15, ge=7, le=35, description="미로 열 수 (홀수 권장)")
    loop_ratio: float = Field(default=0.15, ge=0.0, le=0.5, description="다중 경로/루프 형성 비율")
    seed: Optional[int] = Field(default=None, description="랜덤 시드")

class MazeSolveRequest(BaseModel):
    grid: List[List[int]] = Field(..., description="미로 2차원 배열 (0: 길, 1: 벽)")
    start: List[int] = Field(default=[1, 1], description="시작점 [r, c]")
    goal: Optional[List[int]] = Field(default=None, description="도착점 [r, c] (None이면 우측 하단 자동 설정)")
    algorithm: str = Field(default="both", description="실행할 알고리즘 ('bfs', 'dfs', 'both')")

# ==============================================================================
# 미로 생성 알고리즘 (Randomized DFS with optional loop generation)
# ==============================================================================

def generate_maze_grid(rows: int, cols: int, loop_ratio: float = 0.15, seed: Optional[int] = None) -> Tuple[List[List[int]], List[int], List[int]]:
    if seed is not None:
        random.seed(seed)
        
    # 홀수로 보정
    r_count = rows if rows % 2 == 1 else rows + 1
    c_count = cols if cols % 2 == 1 else cols + 1
    
    # 전체를 벽(1)으로 초기화
    grid = [[1 for _ in range(c_count)] for _ in range(r_count)]
    
    start = [1, 1]
    goal = [r_count - 2, c_count - 2]
    
    # DFS 기반 미로 파기
    stack = [(1, 1)]
    grid[1][1] = 0
    visited = {(1, 1)}
    
    directions = [(-2, 0), (2, 0), (0, -2), (0, 2)]
    
    while stack:
        cr, cc = stack[-1]
        neighbors = []
        
        for dr, dc in directions:
            nr, nc = cr + dr, cc + dc
            if 1 <= nr < r_count - 1 and 1 <= nc < c_count - 1:
                if (nr, nc) not in visited:
                    neighbors.append((dr, dc, nr, nc))
                    
        if neighbors:
            dr, dc, nr, nc = random.choice(neighbors)
            # 벽 허물기
            grid[cr + dr // 2][cc + dc // 2] = 0
            grid[nr][nc] = 0
            visited.add((nr, nc))
            stack.append((nr, nc))
        else:
            stack.pop()
            
    # 다중 경로(루프) 형성을 위해 일부 내부 벽 제거
    # 이를 통해 BFS 최단 경로 vs DFS 우회 경로의 차이를 뚜렷하게 관찰 가능
    inner_walls = []
    for r in range(2, r_count - 2):
        for c in range(2, c_count - 2):
            if grid[r][c] == 1:
                # 위아래가 길이고 좌우가 벽이거나, 좌우가 길이고 위아래가 벽인 경우
                if (grid[r-1][c] == 0 and grid[r+1][c] == 0) or (grid[r][c-1] == 0 and grid[r][c+1] == 0):
                    inner_walls.append((r, c))
                    
    num_to_remove = int(len(inner_walls) * loop_ratio)
    if num_to_remove > 0 and inner_walls:
        for r, c in random.sample(inner_walls, min(num_to_remove, len(inner_walls))):
            grid[r][c] = 0
            
    grid[start[0]][start[1]] = 0
    grid[goal[0]][goal[1]] = 0
    
    return grid, start, goal

# ==============================================================================
# BFS (너비 우선 탐색 - Queue) 미로 탐색 및 단계별 스냅샷 생성
# ==============================================================================

def solve_bfs_trace(grid: List[List[int]], start: List[int], goal: List[int]) -> Dict[str, Any]:
    rows = len(grid)
    cols = len(grid[0])
    sr, sc = start[0], start[1]
    gr, gc = goal[0], goal[1]
    
    total_open_cells = sum(row.count(0) for row in grid)
    
    queue = deque([(sr, sc)])
    visited = set([(sr, sc)])
    parent = {}
    depth_map = {(sr, sc): 0}
    
    steps = []
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]  # 상, 우, 하, 좌
    
    t_start = time.perf_counter()
    step_num = 0
    path_found = False
    max_frontier_size = 1
    
    # 초기 스냅샷
    steps.append({
        "step": step_num,
        "current": [sr, sc],
        "frontier": [[sr, sc]],
        "visited": [[sr, sc]],
        "visited_count": 1,
        "frontier_count": 1,
        "path_found": False,
        "histogram": {
            "depth_distribution": {"0": 1},
            "frontier_size": 1,
            "cell_status": {
                "unvisited": total_open_cells - 1,
                "frontier": 1,
                "visited": 1,
                "wall": rows * cols - total_open_cells
            }
        },
        "metadata": {
            "step_time_ms": 0.0,
            "data_structure": "Queue (FIFO)",
            "time_complexity_state": {
                "notation": "O(V + E)",
                "explored_nodes_V": 1,
                "explored_edges_E": 0,
                "progress_percent": round((1 / max(1, total_open_cells)) * 100, 2)
            },
            "space_complexity_state": {
                "notation": "O(V)",
                "current_frontier_size": 1,
                "max_frontier_size": 1
            },
            "description": f"BFS 시작: 출발점 [{sr}, {sc}]를 FIFO Queue에 삽입합니다."
        }
    })
    
    explored_edges = 0
    
    while queue:
        step_num += 1
        cr, cc = queue.popleft()
        cur_depth = depth_map[(cr, cc)]
        
        if cr == gr and cc == gc:
            path_found = True
            t_now = time.perf_counter()
            # 목표 도달 스냅샷
            steps.append({
                "step": step_num,
                "current": [cr, cc],
                "frontier": [list(item) for item in queue],
                "visited": [list(pos) for pos in visited],
                "visited_count": len(visited),
                "frontier_count": len(queue),
                "path_found": True,
                "histogram": {
                    "depth_distribution": calculate_depth_hist(depth_map),
                    "frontier_size": len(queue),
                    "cell_status": {
                        "unvisited": max(0, total_open_cells - len(visited)),
                        "frontier": len(queue),
                        "visited": len(visited),
                        "wall": rows * cols - total_open_cells
                    }
                },
                "metadata": {
                    "step_time_ms": round((t_now - t_start) * 1000, 3),
                    "data_structure": "Queue (FIFO)",
                    "time_complexity_state": {
                        "notation": "O(V + E)",
                        "explored_nodes_V": len(visited),
                        "explored_edges_E": explored_edges,
                        "progress_percent": round((len(visited) / max(1, total_open_cells)) * 100, 2)
                    },
                    "space_complexity_state": {
                        "notation": "O(V)",
                        "current_frontier_size": len(queue),
                        "max_frontier_size": max_frontier_size
                    },
                    "description": f"목표점 [{gr}, {gc}]에 도달했습니다! BFS의 특성에 따라 최단 경로가 보장됩니다."
                }
            })
            break
            
        newly_added = []
        for dr, dc in directions:
            nr, nc = cr + dr, cc + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                explored_edges += 1
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    parent[(nr, nc)] = (cr, cc)
                    depth_map[(nr, nc)] = cur_depth + 1
                    queue.append((nr, nc))
                    newly_added.append([nr, nc])
                    
        max_frontier_size = max(max_frontier_size, len(queue))
        t_now = time.perf_counter()
        
        steps.append({
            "step": step_num,
            "current": [cr, cc],
            "frontier": [list(item) for item in queue],
            "visited": [list(pos) for pos in visited],
            "visited_count": len(visited),
            "frontier_count": len(queue),
            "path_found": False,
            "histogram": {
                "depth_distribution": calculate_depth_hist(depth_map),
                "frontier_size": len(queue),
                "cell_status": {
                    "unvisited": max(0, total_open_cells - len(visited)),
                    "frontier": len(queue),
                    "visited": len(visited),
                    "wall": rows * cols - total_open_cells
                }
            },
            "metadata": {
                "step_time_ms": round((t_now - t_start) * 1000, 3),
                "data_structure": "Queue (FIFO)",
                "time_complexity_state": {
                    "notation": "O(V + E)",
                    "explored_nodes_V": len(visited),
                    "explored_edges_E": explored_edges,
                    "progress_percent": round((len(visited) / max(1, total_open_cells)) * 100, 2)
                },
                "space_complexity_state": {
                    "notation": "O(V)",
                    "current_frontier_size": len(queue),
                    "max_frontier_size": max_frontier_size
                },
                "description": f"Queue에서 [{cr}, {cc}] (깊이 {cur_depth})를 꺼내고 이웃 {len(newly_added)}개 노드를 Queue 뒤쪽에 추가했습니다."
            }
        })
        
    t_end = time.perf_counter()
    
    # 최단 경로 역추적
    final_path = []
    if path_found:
        curr = (gr, gc)
        while curr != (sr, sc):
            final_path.append(list(curr))
            curr = parent[curr]
        final_path.append([sr, sc])
        final_path.reverse()
        
    return {
        "algorithm": "BFS",
        "data_structure": "Queue (FIFO)",
        "path_found": path_found,
        "final_path": final_path,
        "path_length": len(final_path),
        "total_visited": len(visited),
        "total_steps": len(steps),
        "max_frontier_size": max_frontier_size,
        "total_time_ms": round((t_end - t_start) * 1000, 3),
        "optimality": "Guaranteed Shortest Path (최단 경로 보장)",
        "steps": steps
    }

# ==============================================================================
# DFS (깊이 우선 탐색 - Stack) 미로 탐색 및 단계별 스냅샷 생성
# ==============================================================================

def solve_dfs_trace(grid: List[List[int]], start: List[int], goal: List[int]) -> Dict[str, Any]:
    rows = len(grid)
    cols = len(grid[0])
    sr, sc = start[0], start[1]
    gr, gc = goal[0], goal[1]
    
    total_open_cells = sum(row.count(0) for row in grid)
    
    # Stack: (r, c, depth)
    stack = [(sr, sc, 0)]
    visited = set([(sr, sc)])
    parent = {}
    depth_map = {(sr, sc): 0}
    
    steps = []
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1)]  # 상, 우, 하, 좌
    
    t_start = time.perf_counter()
    step_num = 0
    path_found = False
    max_frontier_size = 1
    
    # 초기 스냅샷
    steps.append({
        "step": step_num,
        "current": [sr, sc],
        "frontier": [[sr, sc]],
        "visited": [[sr, sc]],
        "visited_count": 1,
        "frontier_count": 1,
        "path_found": False,
        "histogram": {
            "depth_distribution": {"0": 1},
            "frontier_size": 1,
            "cell_status": {
                "unvisited": total_open_cells - 1,
                "frontier": 1,
                "visited": 1,
                "wall": rows * cols - total_open_cells
            }
        },
        "metadata": {
            "step_time_ms": 0.0,
            "data_structure": "Stack (LIFO)",
            "time_complexity_state": {
                "notation": "O(V + E)",
                "explored_nodes_V": 1,
                "explored_edges_E": 0,
                "progress_percent": round((1 / max(1, total_open_cells)) * 100, 2)
            },
            "space_complexity_state": {
                "notation": "O(H) <= O(V)",
                "current_frontier_size": 1,
                "max_frontier_size": 1
            },
            "description": f"DFS 시작: 출발점 [{sr}, {sc}]를 LIFO Stack에 푸시(Push)합니다."
        }
    })
    
    explored_edges = 0
    
    while stack:
        step_num += 1
        cr, cc, cur_depth = stack.pop()
        
        if cr == gr and cc == gc:
            path_found = True
            t_now = time.perf_counter()
            steps.append({
                "step": step_num,
                "current": [cr, cc],
                "frontier": [[item[0], item[1]] for item in stack],
                "visited": [list(pos) for pos in visited],
                "visited_count": len(visited),
                "frontier_count": len(stack),
                "path_found": True,
                "histogram": {
                    "depth_distribution": calculate_depth_hist(depth_map),
                    "frontier_size": len(stack),
                    "cell_status": {
                        "unvisited": max(0, total_open_cells - len(visited)),
                        "frontier": len(stack),
                        "visited": len(visited),
                        "wall": rows * cols - total_open_cells
                    }
                },
                "metadata": {
                    "step_time_ms": round((t_now - t_start) * 1000, 3),
                    "data_structure": "Stack (LIFO)",
                    "time_complexity_state": {
                        "notation": "O(V + E)",
                        "explored_nodes_V": len(visited),
                        "explored_edges_E": explored_edges,
                        "progress_percent": round((len(visited) / max(1, total_open_cells)) * 100, 2)
                    },
                    "space_complexity_state": {
                        "notation": "O(H) <= O(V)",
                        "current_frontier_size": len(stack),
                        "max_frontier_size": max_frontier_size
                    },
                    "description": f"목표점 [{gr}, {gc}]에 도달했습니다! DFS는 첫 도달 경로를 찾지만 최단 경로를 보장하지 않습니다."
                }
            })
            break
            
        newly_added = []
        # 스택(LIFO) 특성상 역순으로 넣어야 상/우/하/좌 순서대로 꺼내짐
        for dr, dc in reversed(directions):
            nr, nc = cr + dr, cc + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                explored_edges += 1
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    parent[(nr, nc)] = (cr, cc)
                    depth_map[(nr, nc)] = cur_depth + 1
                    stack.append((nr, nc, cur_depth + 1))
                    newly_added.append([nr, nc])
                    
        max_frontier_size = max(max_frontier_size, len(stack))
        t_now = time.perf_counter()
        
        is_backtracking = len(newly_added) == 0
        desc = (f"Stack에서 [{cr}, {cc}] (깊이 {cur_depth})를 Pop하고 분기 {len(newly_added)}개를 Push했습니다."
                if not is_backtracking else
                f"막다른 길 도달! [{cr}, {cc}]에서 백트래킹(Backtracking)하여 이전 분기로 복귀합니다.")
        
        steps.append({
            "step": step_num,
            "current": [cr, cc],
            "frontier": [[item[0], item[1]] for item in stack],
            "visited": [list(pos) for pos in visited],
            "visited_count": len(visited),
            "frontier_count": len(stack),
            "path_found": False,
            "histogram": {
                "depth_distribution": calculate_depth_hist(depth_map),
                "frontier_size": len(stack),
                "cell_status": {
                    "unvisited": max(0, total_open_cells - len(visited)),
                    "frontier": len(stack),
                    "visited": len(visited),
                    "wall": rows * cols - total_open_cells
                }
            },
            "metadata": {
                "step_time_ms": round((t_now - t_start) * 1000, 3),
                "data_structure": "Stack (LIFO)",
                "time_complexity_state": {
                    "notation": "O(V + E)",
                    "explored_nodes_V": len(visited),
                    "explored_edges_E": explored_edges,
                    "progress_percent": round((len(visited) / max(1, total_open_cells)) * 100, 2)
                },
                "space_complexity_state": {
                    "notation": "O(H) <= O(V)",
                    "current_frontier_size": len(stack),
                    "max_frontier_size": max_frontier_size
                },
                "description": desc
            }
        })
        
    t_end = time.perf_counter()
    
    # 도달 경로 역추적
    final_path = []
    if path_found:
        curr = (gr, gc)
        while curr != (sr, sc):
            final_path.append(list(curr))
            curr = parent[curr]
        final_path.append([sr, sc])
        final_path.reverse()
        
    return {
        "algorithm": "DFS",
        "data_structure": "Stack (LIFO)",
        "path_found": path_found,
        "final_path": final_path,
        "path_length": len(final_path),
        "total_visited": len(visited),
        "total_steps": len(steps),
        "max_frontier_size": max_frontier_size,
        "total_time_ms": round((t_end - t_start) * 1000, 3),
        "optimality": "Not Guaranteed (최단 경로 미보장, 우회 가능)",
        "steps": steps
    }

def calculate_depth_hist(depth_map: Dict[Tuple[int, int], int], max_bins: int = 10) -> Dict[str, int]:
    """깊이(Depth) 구간별 방문 노드 수 히스토그램 생성"""
    if not depth_map:
        return {}
    max_d = max(depth_map.values())
    if max_d <= max_bins:
        # 단일 깊이별 카운트
        hist = {}
        for d in sorted(set(depth_map.values())):
            hist[str(d)] = sum(1 for val in depth_map.values() if val == d)
        return hist
    else:
        # 버킷 구간 히스토그램 (예: 0-4, 5-9 등)
        bin_size = max(1, (max_d + 1) // max_bins)
        hist = {}
        for d in depth_map.values():
            bin_idx = (d // bin_size) * bin_size
            key = f"{bin_idx}~{bin_idx + bin_size - 1}"
            hist[key] = hist.get(key, 0) + 1
        return hist

# ==============================================================================
# FastAPI 라우트 정의
# ==============================================================================

@app.get("/health")
def health():
    return {"status": "ok", "service": "AlgoMaze Lab BFS vs DFS Visualizer API"}

@app.post("/api/maze/generate")
def generate_maze(req: MazeGenerateRequest):
    grid, start, goal = generate_maze_grid(req.rows, req.cols, req.loop_ratio, req.seed)
    return {
        "rows": len(grid),
        "cols": len(grid[0]),
        "grid": grid,
        "start": start,
        "goal": goal,
        "total_cells": len(grid) * len(grid[0]),
        "open_cells": sum(row.count(0) for row in grid),
        "wall_cells": sum(row.count(1) for row in grid)
    }

@app.post("/api/maze/solve")
def solve_maze(req: MazeSolveRequest):
    grid = req.grid
    if not grid or not grid[0]:
        raise HTTPException(status_code=400, detail="유효한 미로 격자(grid)가 필요합니다.")
        
    start = req.start
    goal = req.goal or [len(grid) - 2, len(grid[0]) - 2]
    
    response = {
        "grid_size": [len(grid), len(grid[0])],
        "start": start,
        "goal": goal
    }
    
    if req.algorithm in ("bfs", "both"):
        response["bfs"] = solve_bfs_trace(grid, start, goal)
        
    if req.algorithm in ("dfs", "both"):
        response["dfs"] = solve_dfs_trace(grid, start, goal)
        
    if req.algorithm == "both" and "bfs" in response and "dfs" in response:
        bfs_res = response["bfs"]
        dfs_res = response["dfs"]
        response["comparison"] = {
            "path_length_diff": dfs_res["path_length"] - bfs_res["path_length"],
            "visited_diff": dfs_res["total_visited"] - bfs_res["total_visited"],
            "total_steps_diff": dfs_res["total_steps"] - bfs_res["total_steps"],
            "max_memory_frontier": {
                "bfs_queue_max": bfs_res["max_frontier_size"],
                "dfs_stack_max": dfs_res["max_frontier_size"]
            },
            "optimality_comparison": {
                "bfs": "최단 거리 보장 (Level-by-Level 탐색)",
                "dfs": "최단 거리 미보장 (막다른 길 도달 시 백트래킹 발생)"
            },
            "summary_comment": (
                f"BFS는 총 {bfs_res['total_visited']}개 노드를 탐색하여 길이 {bfs_res['path_length']}의 최단 경로를 확정했습니다. "
                f"반면 DFS는 총 {dfs_res['total_visited']}개 노드를 탐색하여 길이 {dfs_res['path_length']}의 경로를 발견했습니다."
            )
        }
        
    return response

@app.get("/api/benchmark/default")
def get_default_benchmark():
    """초기 렌더링용 기본 15x15 미로 및 사전 시뮬레이션 결과 제공"""
    grid, start, goal = generate_maze_grid(15, 15, loop_ratio=0.15, seed=42)
    bfs_result = solve_bfs_trace(grid, start, goal)
    dfs_result = solve_dfs_trace(grid, start, goal)
    
    return {
        "rows": 15,
        "cols": 15,
        "grid": grid,
        "start": start,
        "goal": goal,
        "bfs": bfs_result,
        "dfs": dfs_result
    }

from pathlib import Path

# ==============================================================================
# 정적 프론트엔드 서빙
# ==============================================================================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
def index():
    return FileResponse(str(INDEX_FILE))
