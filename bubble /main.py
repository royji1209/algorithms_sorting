import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# 모든 도메인에서의 교차 출처 리소스 공유(CORS) 허용
CORS(app)

def bubble_sort_trace(arr):
    """
    버블 정렬을 실행하면서 각 스텝별 스냅샷을 기록하는 함수
    """
    history = []
    n = len(arr)
    # 원본 배열 복사본 생성
    current_arr = list(arr)
    
    step_num = 0
    # 초기 상태 기록
    history.append({
        "step": step_num,
        "description": "초기 배열 상태",
        "array": list(current_arr),
        "comparing_indices": [],
        "swapped": False
    })
    
    # 버블 정렬 알고리즘 수행
    for i in range(n):
        swapped_in_pass = False
        for j in range(0, n - i - 1):
            step_num += 1
            swapped = False
            
            # 인접한 두 원소 비교
            if current_arr[j] > current_arr[j + 1]:
                # 교환(Swap) 수행
                current_arr[j], current_arr[j + 1] = current_arr[j + 1], current_arr[j]
                swapped = True
                swapped_in_pass = True
                desc = f"인덱스 {j}({current_arr[j+1]})와 {j+1}({current_arr[j]}) 비교 후 교환"
            else:
                desc = f"인덱스 {j}({current_arr[j]})와 {j+1}({current_arr[j+1]}) 비교 (교환 없음)"
            
            # 단계별 스냅샷 저장
            history.append({
                "step": step_num,
                "description": desc,
                "array": list(current_arr),
                "comparing_indices": [j, j + 1],
                "swapped": swapped
            })
            
        # 해당 패스에서 교환이 한 번도 없었다면 이미 정렬 완료
        if not swapped_in_pass:
            break
            
    # 최종 완료 상태 기록
    history.append({
        "step": step_num + 1,
        "description": "정렬 완료",
        "array": list(current_arr),
        "comparing_indices": [],
        "swapped": False
    })
    
    return history, current_arr

@app.route("/", methods=["POST"])
def sort_handler():
    """
    정렬 요청을 처리하는 엔드포인트 핸들러
    """
    try:
        data = request.get_json(silent=True)
        if not data or "array" not in data:
            return jsonify({"status": "error", "message": "'array' 키가 포함된 JSON이 필요합니다."}), 400
        
        input_array = data["array"]
        if not isinstance(input_array, list):
            return jsonify({"status": "error", "message": "'array'는 리스트 형태여야 합니다."}), 400
        
        # 숫자 타입 검증 및 변환
        validated_array = [int(x) for x in input_array]
        
        # 정렬 실행 및 히스토리 수집
        steps, sorted_array = bubble_sort_trace(validated_array)
        
        # 결과 반환 (복잡도 정보 포함)
        return jsonify({
            "status": "success",
            "initial_array": validated_array,
            "sorted_array": sorted_array,
            "total_steps": len(steps) - 1,
            "complexity": {
                "time_worst": "O(N^2)",
                "time_average": "O(N^2)",
                "time_best": "O(N)",
                "space": "O(1)"
            },
            "steps": steps
        }), 200

    except ValueError:
        return jsonify({"status": "error", "message": "배열 요소는 정수여야 합니다."}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    # Cloud Run에서 기본 제공하는 PORT 환경 변수 바인딩
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
