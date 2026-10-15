import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def bubble_sort_trace(arr):
    history = []
    n = len(arr)
    current_arr = list(arr)
    
    step_num = 0
    history.append({
        "step": step_num,
        "description": "초기 배열 상태",
        "array": list(current_arr),
        "comparing_indices": [],
        "swapped": False
    })
    
    for i in range(n):
        swapped_in_pass = False
        for j in range(0, n - i - 1):
            step_num += 1
            swapped = False
            
            if current_arr[j] > current_arr[j + 1]:
                current_arr[j], current_arr[j + 1] = current_arr[j + 1], current_arr[j]
                swapped = True
                swapped_in_pass = True
                desc = f"인덱스 {j}({current_arr[j+1]})와 {j+1}({current_arr[j]}) 비교 후 교환"
            else:
                desc = f"인덱스 {j}({current_arr[j]})와 {j+1}({current_arr[j+1]}) 비교 (교환 없음)"
            
            history.append({
                "step": step_num,
                "description": desc,
                "array": list(current_arr),
                "comparing_indices": [j, j + 1],
                "swapped": swapped
            })
            
        if not swapped_in_pass:
            break
            
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
    try:
        data = request.get_json(silent=True)
        if not data or "array" not in data:
            return jsonify({"status": "error", "message": "'array' 키가 포함된 JSON이 필요합니다."}), 400
        
        input_array = data["array"]
        if not isinstance(input_array, list):
            return jsonify({"status": "error", "message": "'array'는 리스트 형태여야 합니다."}), 400
        
        validated_array = [int(x) for x in input_array]
        steps, sorted_array = bubble_sort_trace(validated_array)
        
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
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
