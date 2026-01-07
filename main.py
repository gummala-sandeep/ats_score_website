import os
from flask import Flask, request, jsonify, render_template
from google import genai
import PyPDF2


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

client = genai.Client(api_key="YOUR API KEY")


app = Flask(__name__, static_folder='.', static_url_path='', template_folder='.')
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# PDF PARSING

def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() or ""
    return text


# RESUME PARSER (LLM)

def parse_resume(resume_text):
    prompt = f"""
You are a resume parser.

Extract:
- Skills
- Experience summary
- Education
- Tools & technologies

Resume:
{resume_text}

Return in bullet points.
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise Exception("API quota exceeded. Please try again later or upgrade your API plan.")
        raise e


# JOB DESCRIPTION PARSER

def parse_job_description(jd_text):
    prompt = f"""
Extract:
- Required skills
- Responsibilities
- Preferred qualifications

Job Description:
{jd_text}

Return in bullet points.
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise Exception("API quota exceeded. Please try again later or upgrade your API plan.")
        raise e

# ATS MATCHING

def ats_match(parsed_resume, parsed_jd):
    prompt = f"""
You are an Applicant Tracking System.

Compare the resume and job description.

Resume:
{parsed_resume}

Job Description:
{parsed_jd}

Provide:
1. Match percentage (0-100)
2. Matching skills
3. Missing skills
4. Strengths
5. Improvement suggestions
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise Exception("API quota exceeded. Please try again later or upgrade your API plan.")
        raise e


# SERVE FRONTEND

@app.route('/')
def index():
    return render_template('index.html')


# API ROUTE (PDF UPLOAD)

@app.route("/analyze", methods=["POST"])
def analyze():
    if "resume" not in request.files:
        return jsonify({"error": "Resume PDF is required"}), 400

    resume_file = request.files["resume"]
    jd_text = request.form.get("job_description")

    if not jd_text:
        return jsonify({"error": "Job description is required"}), 400

    # Save PDF
    pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], resume_file.filename)
    resume_file.save(pdf_path)

    # Extract resume text
    resume_text = extract_text_from_pdf(pdf_path)

    try:
        # Parse using Gemini
        parsed_resume = parse_resume(resume_text)
        parsed_jd = parse_job_description(jd_text)

        # ATS Matching
        ats_result = ats_match(parsed_resume, parsed_jd)

        response_data = {
            "parsed_resume": parsed_resume,
            "parsed_job_description": parsed_jd,
            "ats_result": ats_result
        }
        
        print("Sending response:", response_data)
        return jsonify(response_data)
    except Exception as e:
        error_message = str(e)
        print("Error occurred:", error_message)
        return jsonify({"error": error_message}), 503


if __name__ == "__main__":
    app.run(debug=True, port=8080)
