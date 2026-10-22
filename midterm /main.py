# -*- coding: utf-8 -*-
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


class FixedQueue:
    """고정 길이 큐 (Ring Buffer 기반 Fixed-Size Queue)"""
    def __init__(self, capacity=20):
        # 1) 초기화
        self.capacity = int(capacity)
        self.que = [None] * self.capacity
        self.front = 0
        self.rear = 0
        self.no = 0

    # 3) 현재 데이터 개수(길이/크기) 반환
    def size(self):
        return self.no

    # 4) 상태 검사 (full, empty)
    def is_empty(self):
        return self.no <= 0

    def is_full(self):
        return self.no >= self.capacity

    def get_status(self):
        state_str = "FULL (가득 참)" if self.is_full() else ("EMPTY (비어 있음)" if self.is_empty() else "NORMAL (여유 있음)")
        return {
            "is_empty": self.is_empty(),
            "is_full": self.is_full(),
            "state_text": state_str
        }

    # 2) push
    def push(self, value):
        if self.is_full():
            return {"success": False, "message": "Queue Overflow: 큐가 가득 찼습니다."}
        self.que[self.rear] = value
        self.rear = (self.rear + 1) % self.capacity
        self.no += 1
        return {"success": True, "message": f"값 {value}을(를) Push했습니다."}

    # 2) pop
    def pop(self):
        if self.is_empty():
            return {"success": False, "value": None, "message": "Queue Underflow: 큐가 비어 있습니다."}
        val = self.que[self.front]
        self.que[self.front] = None
        self.front = (self.front + 1) % self.capacity
        self.no -= 1
        return {"success": True, "value": val, "message": f"Front에서 값 {val}을(를) Pop했습니다."}

    # 5) 전면(Front) 데이터 확인
    def peek(self):
        if self.is_empty():
            return {"success": False, "value": None, "message": "큐가 비어 있습니다."}
        return {"success": True, "value": self.que[self.front], "front_index": self.front}

    # 6) 큐 전체 데이터 삭제
    def clear(self):
        self.que = [None] * self.capacity
        self.front = 0
        self.rear = 0
        self.no = 0

    # 7) 값의 Index 검색
    def find_index(self, value):
        for i in range(self.no):
            idx = (i + self.front) % self.capacity
            if self.que[idx] == value:
                return {"found": True, "physical_index": idx, "logical_order": i}
        return {"found": False, "physical_index": -1, "logical_order": -1}

    # 8) 값의 개수(길이/크기)
    def count_value(self, value):
        cnt = 0
        for i in range(self.no):
            idx = (i + self.front) % self.capacity
            if self.que[idx] == value:
                cnt += 1
        return cnt

    # 9) 값의 존재 여부 검사
    def contains(self, value):
        return self.count_value(value) > 0

    # 10) Front부터 Rear까지 출력
    def dump_front_to_rear(self):
        result = []
        for i in range(self.no):
            idx = (i + self.front) % self.capacity
            result.append(self.que[idx])
        return result

    def snapshot(self):
        return {
            "capacity": self.capacity,
            "current_size": self.size(),
            "front": self.front,
            "rear": self.rear,
            "status": self.get_status(),
            "front_data": self.que[self.front] if not self.is_empty() else None,
            "raw_buffer": list(self.que),
            "front_to_rear": self.dump_front_to_rear()
        }


GLOBAL_QUEUE = FixedQueue(capacity=20)


@app.route('/queue', methods=['POST'])
@app.route('/', methods=['POST'])
def handle_queue():
    global GLOBAL_QUEUE
    try:
        data = request.get_json(silent=True) or {}
        action = data.get("action", "RUN_SCENARIO")

        client_state = data.get("queue_state")
        if client_state and action != "INIT":
            q = FixedQueue(capacity=int(client_state.get("capacity", 20)))
            q.que = client_state.get("raw_buffer", [None] * q.capacity)
            q.front = int(client_state.get("front", 0))
            q.rear = int(client_state.get("rear", 0))
            q.no = int(client_state.get("current_size", 0))
        else:
            q = GLOBAL_QUEUE

        if action == "RUN_SCENARIO":
            capacity = int(data.get("capacity", 20))
            input_arr = data.get("array", [19, 15, 29, 25, 33, 35, 49, 42, 50, 55, 62, 66, 77, 80])
            target_search = int(data.get("search_val", 42))
            target_exist = int(data.get("exist_val", 88))

            q = FixedQueue(capacity=capacity)
            steps = []

            # 1) 큐의 사이즈는 20임 (초기화)
            steps.append({
                "step": 1,
                "title": f"1) 큐 초기화 (사이즈 = {capacity})",
                "action_type": "INIT",
                "highlight_indices": [],
                "result_text": f"크기 {capacity}인 고정 길이 큐를 생성하고 초기화했습니다.",
                "snapshot": q.snapshot()
            })

            # 2) 위의 배열을 push하세요
            pushed_items = []
            for val in input_arr:
                q.push(int(val))
                pushed_items.append(int(val))

            steps.append({
                "step": 2,
                "title": f"2) 배열 데이터 Push ({len(input_arr)}개 원소 삽입)",
                "action_type": "PUSH_ARRAY",
                "highlight_indices": list(range(len(input_arr))),
                "result_text": f"입력 배열 {pushed_items}을(를) 차례대로 Push 완료했습니다.",
                "snapshot": q.snapshot()
            })

            # 3) 현재의 개수는?
            cur_size = q.size()
            steps.append({
                "step": 3,
                "title": "3) 현재의 데이터 개수(길이/크기) 확인",
                "action_type": "SIZE",
                "highlight_indices": [],
                "result_text": f"현재 큐에 저장된 데이터 개수는 총 {cur_size}개입니다. (최대 용량: {q.capacity})",
                "snapshot": q.snapshot()
            })

            # 4) 현재 상태는?
            st = q.get_status()
            steps.append({
                "step": 4,
                "title": "4) 현재 상태 검사 (Full / Empty)",
                "action_type": "STATUS",
                "highlight_indices": [],
                "result_text": f"Empty 여부: {st['is_empty']} | Full 여부: {st['is_full']} -> 상태: {st['state_text']} (여유 공간: {q.capacity - cur_size}칸)",
                "snapshot": q.snapshot()
            })

            # 5) 전면 데이터 확인
            pk = q.peek()
            steps.append({
                "step": 5,
                "title": "5) 전면(Front) 데이터 확인 (Peek)",
                "action_type": "PEEK",
                "highlight_indices": [q.front] if pk["success"] else [],
                "result_text": f"전면(Front, 인덱스 {q.front})에 위치한 데이터는 [{pk['value']}] 입니다.",
                "snapshot": q.snapshot()
            })

            # 6) 42 값의 위치와 개수는?
            find_42 = q.find_index(target_search)
            cnt_42 = q.count_value(target_search)
            hi_42 = [find_42["physical_index"]] if find_42["found"] else []
            steps.append({
                "step": 6,
                "title": f"6) 값 '{target_search}'의 위치(Index)와 개수 검색",
                "action_type": "SEARCH",
                "highlight_indices": hi_42,
                "result_text": (
                    f"값 {target_search}의 인덱스 위치: {find_42['physical_index']} "
                    f"(Front로부터 {find_42['logical_order'] + 1}번째) | 큐 내 '{target_search}'의 개수: {cnt_42}개"
                    if find_42["found"] else f"값 {target_search}을(를) 찾을 수 없습니다. (개수: 0개)"
                ),
                "snapshot": q.snapshot()
            })

            # 7) 88 값의 존재 여부는?
            exist_88 = q.contains(target_exist)
            find_88 = q.find_index(target_exist)
            hi_88 = [find_88["physical_index"]] if exist_88 else []
            steps.append({
                "step": 7,
                "title": f"7) 값 '{target_exist}'의 존재 여부 검사",
                "action_type": "CONTAINS",
                "highlight_indices": hi_88,
                "result_text": f"큐 내부에 값 {target_exist}의 존재 여부: {exist_88} ({'존재함 (True)' if exist_88 else '존재하지 않음 (False)'})",
                "snapshot": q.snapshot()
            })

            # 8) 배열 전체를 출력
            all_elements = q.dump_front_to_rear()
            steps.append({
                "step": 8,
                "title": "8) Front부터 Rear까지 배열 전체 출력",
                "action_type": "DUMP",
                "highlight_indices": [(i + q.front) % q.capacity for i in range(q.no)],
                "result_text": f"Front({q.front}) -> Rear({q.rear}) 전체 데이터 출력: {all_elements}",
                "snapshot": q.snapshot()
            })

            GLOBAL_QUEUE = q
            return jsonify({
                "status": "success",
                "mode": "SCENARIO",
                "steps": steps,
                "final_snapshot": q.snapshot()
            }), 200

        elif action == "INIT":
            cap = int(data.get("capacity", 20))
            q = FixedQueue(capacity=cap)
            msg = f"사이즈 {cap}인 고정 길이 큐로 초기화되었습니다."
            highlight = []

        elif action == "PUSH":
            val_list = data.get("values", [])
            msgs = []
            highlight = []
            for v in val_list:
                res = q.push(int(v))
                msgs.append(res["message"])
                if res["success"]:
                    highlight.append((q.rear - 1) % q.capacity)
            msg = " / ".join(msgs)

        elif action == "POP":
            old_front = q.front
            res = q.pop()
            msg = res["message"]
            highlight = [old_front] if res["success"] else []

        elif action == "PEEK":
            res = q.peek()
            msg = f"전면(Front) 데이터: {res['value']} (인덱스: {q.front})" if res["success"] else res["message"]
            highlight = [q.front] if res["success"] else []

        elif action == "SIZE":
            msg = f"현재 데이터 개수: {q.size()}개 (최대 용량: {q.capacity}개)"
            highlight = []

        elif action == "STATUS":
            st = q.get_status()
            msg = f"상태 검사 -> Empty: {st['is_empty']}, Full: {st['is_full']} ({st['state_text']})"
            highlight = []

        elif action == "CLEAR":
            q.clear()
            msg = "큐 전체 데이터를 삭제(Clear)했습니다."
            highlight = []

        elif action == "SEARCH":
            val = int(data.get("value", 42))
            idx_info = q.find_index(val)
            cnt = q.count_value(val)
            if idx_info["found"]:
                msg = f"값 [{val}] 검색 결과 -> 존재 여부: True | 위치(Index): {idx_info['physical_index']} | 개수: {cnt}개"
                highlight = [idx_info["physical_index"]]
            else:
                msg = f"값 [{val}] 검색 결과 -> 존재 여부: False | 위치(Index): 없음(-1) | 개수: 0개"
                highlight = []

        elif action == "DUMP":
            arr_dump = q.dump_front_to_rear()
            msg = f"Front부터 Rear까지 전체 출력 ({len(arr_dump)}개): {arr_dump}"
            highlight = [(i + q.front) % q.capacity for i in range(q.no)]

        else:
            return jsonify({"status": "error", "message": f"알 수 없는 명령: {action}"}), 400

        GLOBAL_QUEUE = q
        return jsonify({
            "status": "success",
            "mode": "SINGLE",
            "action": action,
            "message": msg,
            "highlight_indices": highlight,
            "snapshot": q.snapshot()
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Fixed-Size Queue Server"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
