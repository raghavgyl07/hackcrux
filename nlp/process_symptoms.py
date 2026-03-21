import sys
import json
from typing import List, Dict, Any

# Standard imports at top level to help type checkers
try:
    import spacy # type: ignore
    # Load model once at module level
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = None
except ImportError:
    nlp = None

def get_tokens(text: str) -> List[str]:
    """Tokenize text using spaCy if available, otherwise fallback to split."""
    if nlp is not None:
        try:
            doc = nlp(text.lower())
            return [t.text for t in doc]
        except Exception:
            pass
    return text.lower().split()

def calculate_priority(text: str, age: int) -> Dict[str, Any]:
    """Determine patient priority based on input text and age."""
    symptoms: List[str] = []
    scores: List[int] = []
    
    tokens: List[str] = get_tokens(text)
    txt_lower: str = text.lower()

    # 1. Critical Symptoms (Hardcoded checks)
    if "chest pain" in txt_lower:
        scores.append(90)
        symptoms.append("chest pain")
    elif "chest" in tokens and "pain" in tokens:
        scores.append(90)
        symptoms.append("chest pain")

    if "breathing difficulty" in txt_lower or ("breathing" in tokens and "difficulty" in tokens):
        scores.append(85)
        symptoms.append("breathing difficulty")
    elif "shortness of breath" in txt_lower:
        scores.append(85)
        symptoms.append("breathing difficulty")

    # 2. Other Symptoms (Table-based)
    severity_map: Dict[str, int] = {
        "fever": 40, "headache": 30, "cough": 35,
        "chills": 20, "nausea": 25, "dizzy": 40, "bleeding": 85
    }

    current_symptoms_str: str = " ".join(symptoms)
    for word, s_val in severity_map.items():
        if word in tokens and word not in current_symptoms_str:
            scores.append(s_val)
            symptoms.append(word)

    # 3. Age Risk
    age_boost: int = 0
    if age <= 10:
        age_boost = 15
    elif age <= 40:
        age_boost = 5
    elif age <= 60:
        age_boost = 15
    else:
        age_boost = 25

    base_score: int = sum(scores)
    total: int = base_score + age_boost

    # 4. Result Formatting
    level: str = "Low"
    if total >= 180:
        level = "Risky"
    elif total >= 120:
        level = "High"
    elif total >= 60:
        level = "Medium"

    return {
        "matched_symptoms": symptoms,
        "base_score": base_score,
        "age_factor": age_boost,
        "priority_score": total,
        "priority_level": level
    }

if __name__ == "__main__":
    # Handle CLI arguments
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
        p_text: str = str(input_data.get("text", ""))
        p_age: int = int(input_data.get("age", 0))

        output = calculate_priority(p_text, p_age)
        print(json.dumps(output))
    except Exception as err:
        print(json.dumps({"error": str(err)}))
        sys.exit(1)
