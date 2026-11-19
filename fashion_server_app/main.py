import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# Flask 애플리케이션 초기화
app = Flask(__name__)
# GAS 및 외부 웹 호출 시 CORS 차단을 방지하기 위해 전체 허용 설정
CORS(app)


def selection_sort_trace(arr):
    """단순 선택 정렬(Selection Sort)을 수행하며 각 비교 및 교환 과정을 단계별(Step)로 기록하는 함수

    - 매 회전(Pass)마다 아직 정렬되지 않은 영역에서 '최솟값'을 찾아 맨 앞자리와 교환합니다.
    """
    history = []
    n = len(arr)
    # 원본 데이터 훼손 방지를 위한 복사본 생성
    current_arr = list(arr)

    step_num = 0

    # 1. 초기 배열 상태 기록
    history.append({
        "step": step_num,
        "description": "초기 배열 상태",
        "array": list(current_arr),
        "comparing": [],  # 현재 비교 중인 인덱스 목록
        "min_index": -1,  # 현재 패스에서 발견된 최솟값 인덱스
        "swapped": False,  # 교환 발생 여부
    })

    # 2. 선택 정렬 알고리즘 메인 루프 (0번째부터 n-2번째까지 기준 위치 이동)
    for i in range(n - 1):
        min_idx = i  # 현재 패스에서 가장 작은 값의 위치(인덱스)로 가정

        # 기준 위치 i 이후의 원소들을 순회하며 실제 최솟값 탐색
        for j in range(i + 1, n):
            step_num += 1

            # 현재 최솟값 후보(current_arr[min_idx])와 비교 원소(current_arr[j]) 비교
            if current_arr[j] < current_arr[min_idx]:
                min_idx = j
                desc = (
                    f"인덱스 {j}의 값({current_arr[j]})이 기존 최솟값보다 작으므로"
                    f" 새로운 최솟값으로 갱신"
                )
            else:
                desc = f"인덱스 {min_idx}(최솟값 후보:{current_arr[min_idx]})와 인덱스 {j}({current_arr[j]}) 비교"

            # 탐색 진행 상황 스냅샷 저장
            history.append({
                "step": step_num,
                "description": desc,
                "array": list(current_arr),
                "comparing": [min_idx, j],  # 비교 및 갱신에 관여한 인덱스 하이라이트
                "min_index": min_idx,
                "swapped": False,
            })

        # 한 패스가 끝난 후, 기준 위치 i와 최솟값 위치 min_idx가 다르면 교환(Swap)
        step_num += 1
        swapped = False
        if min_idx != i:
            # 원소 맞바꾸기 실행
            current_arr[i], current_arr[min_idx] = (
                current_arr[min_idx],
                current_arr[i],
            )
            swapped = True
            swap_desc = f"패스 {i+1} 종료: 인덱스 {i}와 최솟값 인덱스 {min_idx}({current_arr[i]}) 교환 완료"
        else:
            swap_desc = f"패스 {i+1} 종료: 인덱스 {i}가 이미 최솟값이므로 교환 없음"

        # 패스 교환 결과 스냅샷 저장
        history.append({
            "step": step_num,
            "description": swap_desc,
            "array": list(current_arr),
            "comparing": [i, min_idx] if swapped else [i],
            "min_index": i,
            "swapped": swapped,
        })

    # 3. 최종 정렬 완료 상태 기록
    step_num += 1
    history.append({
        "step": step_num,
        "description": "단순 선택 정렬 완료",
        "array": list(current_arr),
        "comparing": [],
        "min_index": -1,
        "swapped": False,
    })

    return history, current_arr


# [헬스체크 경로] 브라우저 직접 접속 또는 Cloud Run 기동 상태 점검용
@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    """서버가 정상 동작 중인지 확인하는 헬스체크 엔드포인트"""
    return jsonify({"status": "healthy", "service": "selection-sort"}), 200


# [정렬 엔드포인트] GAS 및 클라이언트 통신용
@app.route("/sort", methods=["POST"])
def sort_handler():
    """GAS(클라이언트)로부터 정수 배열을 받아 단순 선택 정렬을 수행하는 엔드포인트"""
    try:
        # 요청 본문(JSON) 파싱
        content = request.get_json(silent=True)
        if not content:
            return (
                jsonify({
                    "status": "error",
                    "message": "JSON 형식의 요청 본문이 필요합니다.",
                }),
                400,
            )

        # 2번 표준 규격에 맞게 'numbers' 키 우선 조회 (하위 호환을 위해 'array'도 지원)
        raw_list = content.get("numbers") or content.get("array")
        if raw_list is None or not isinstance(raw_list, list):
            return (
                jsonify({
                    "status": "error",
                    "message": (
                        "'numbers' 키에 정렬할 정수 배열(list)을 전달해야"
                        " 합니다."
                    ),
                }),
                400,
            )

        if len(raw_list) == 0:
            return (
                jsonify({
                    "status": "error",
                    "message": "배열에 하나 이상의 원소가 있어야 합니다.",
                }),
                400,
            )

        # 모든 원소를 정수형으로 변환 및 유효성 검사
        validated_array = [int(x) for x in raw_list]

        # 단순 선택 정렬 실행 및 단계별 이력 추적
        steps, sorted_array = selection_sort_trace(validated_array)

        # 정상 응답 JSON 반환 (표준 규격 필드명 완벽 매핑)
        return (
            jsonify({
                "status": "success",
                "original": validated_array,  # 원본 배열
                "sorted_array": sorted_array,  # 최종 정렬 배열
                "total_steps": len(steps) - 1,  # 총 단계 수
                "complexity": {
                    "time_best": "O(N^2)",  # 선택 정렬은 항상 모든 쌍을 비교하므로 최선도 O(N^2)
                    "time_average": "O(N^2)",
                    "time_worst": "O(N^2)",
                    "space": "O(1)",  # 제자리 정렬이므로 O(1)
                },
                "steps": steps,  # 단계별 시각화 데이터
            }),
            200,
        )

    except ValueError:
        return (
            jsonify({
                "status": "error",
                "message": "배열의 모든 요소는 유효한 정수여야 합니다.",
            }),
            400,
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 로컬 디버깅 및 Cloud Run 기동용 포트 바인딩
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
