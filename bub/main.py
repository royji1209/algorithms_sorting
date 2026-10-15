import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def bubble_sort_trace(arr):
    steps = []
    data = list(arr)
    n = len(data)
    
    steps.append({
        "step": 0,
        "array": list(data),
        "comparing": [],
        "swapped": False,
        "description": "정렬 시작 전 초기 배열 상태입니다."
    })
    
    step_count = 1
    for i in range(n):
        swapped_in_pass = False
        for j in range(0, n - i - 1):
            is_swap = False
            if data[j] > data[j + 1]:
                data[j], data[j + 1] = data[j + 1], data[j]
                is_swap = True
                swapped_in_pass = True
            
            steps.append({
                "step": step_count,
                "pass": i + 1,
                "array": list(data),
                "comparing": [j, j + 1],
                "swapped": is_swap,
                "description": f"인덱스 {j}(값: {data[j + 1] if is_swap else data[j]})와 인덱스 {j+1}(값: {data[j] if is_swap else data[j+1]}) 비교 " + 
                               ("후 교환(Swap)되었습니다." if is_swap else "-> 자리 유지")
            })
            step_count += 1
            
        if not swapped_in_pass:
            break
            
    steps.append({
        "step": step_count,
        "array": list(data),
        "comparing": [],
        "swapped": False,
        "description": "버블 정렬이 완료되었습니다."
    })
    
    return steps, data

@app.route('/sort', methods=['POST'])
def handle_sort():
    try:
        content = request.get_json(silent=True)
        if not content or 'numbers' not in content:
            return jsonify({
                "status": "error",
                "message": "JSON 형식의 'numbers' 배열 필드가 필요합니다."
            }), 400
            
        numbers = content['numbers']
        if not isinstance(numbers, list) or not all(isinstance(x, (int, float)) for x in numbers):
            return jsonify({
                "status": "error",
                "message": "'numbers'는 숫자들의 배열이어야 합니다."
            }), 400

        steps, sorted_result = bubble_sort_trace(numbers)
        
        complexity = {
            "time_best": "O(N)",
            "time_average": "O(N²)",
            "time_worst": "O(N²)",
            "space": "O(1)"
        }
        
        return jsonify({
            "status": "success",
            "original": numbers,
            "sorted": sorted_result,
            "total_steps": len(steps) - 1,
            "complexity": complexity,
            "steps": steps
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
