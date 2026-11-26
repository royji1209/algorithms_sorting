---
name: same-folder-py-import
description: main.py와 같은 디렉터리에 있는 다른 .py 모듈 파일들을 main.py에서 안정적으로 불러와 사용할 수 있도록 임포트 구조, 진입점 가드(__name__ == "__main__"), 호출 코드를 자동 생성·수정하는 스킬
version: 1.0.0
---

# 같은 폴더 .py 모듈 임포트 자동화 스킬

`main.py`와 동일한 폴더에 위치한 다른 `.py` 파일들의 함수·클래스·상수·라우터를 `main.py`에서 불러와 사용할 수 있도록 임포트 및 실행 구조를 생성·수정한다.

## 핵심 규칙

1. **같은 폴더 기준 임포트**: `main.py`와 같은 디렉터리에 있는 `<모듈명>.py` 파일은 `from <모듈명> import ...` 또는 `import <모듈명>` 형태로 불러온다. (모듈 파일명에 하이픈 `-` 대신 언더스코어 `_` 사용)
2. **직접 실행 가드 필수**: 불러오는 보조 `.py` 파일과 `main.py` 모두 테스트·샘플 실행 코드가 있다면 `if __name__ == "__main__":` 블록 안에 감싸서 `import` 시 의도치 않은 실행이나 부작용이 발생하지 않게 한다.
3. **순환 임포트 방지**: `a.py`가 `b.py`를 부르고 `b.py`가 다시 `a.py`를 부르는 순환 참조를 만들지 않고, 공용 로직은 별도 모듈로 분리하거나 함수 내부·호출 시점에 참조한다.
4. **기존 코드 보존**: 기존 `main.py`와 보조 `.py` 파일의 핵심 기능은 유지하면서 필요한 `import` 구문과 호출 코드만 추가한다.

## 자동 생성 코드 기준

### 보조 모듈 예시 (`helper.py`)
```python
def format_greeting(name: str) -> str:
    # 같은 폴더의 main.py에서 import해 사용하는 함수
    clean_name = name.strip() if name else "사용자"
    return f"{clean_name}님, 연결되었습니다."


if __name__ == "__main__":
    # 단독 실행 시에만 동작하는 테스트 코드
    print(format_greeting("테스트"))
```

### 메인 모듈 예시 (`main.py`)
```python
from helper import format_greeting


def main():
    greeting = format_greeting("사용자")
    print(greeting)


if __name__ == "__main__":
    main()
```
