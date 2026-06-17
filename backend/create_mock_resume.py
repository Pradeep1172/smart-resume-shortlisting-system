from reportlab.pdfgen import canvas
import os

def create_pdf(filename):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "John Candidate")
    c.drawString(100, 730, "Email: john@candidate.com | Phone: 123-456-7890")
    c.drawString(100, 700, "PROFESSIONAL SUMMARY")
    c.drawString(100, 680, "Dedicated developer with 3 years of experience in Python and web development.")
    c.drawString(100, 650, "SKILLS")
    c.drawString(100, 630, "Programming: Python, SQL, JavaScript, HTML, CSS")
    c.drawString(100, 610, "Frameworks: Flask, React, Node.js")
    c.drawString(100, 580, "EXPERIENCE")
    c.drawString(100, 560, "Software Engineer - Smart Resume Co (2024 - Present)")
    c.drawString(100, 540, "Developed Flask web APIs and integrated them with SQL databases.")
    c.drawString(100, 510, "PROJECTS")
    c.drawString(100, 490, "Project 1: Resume Shortlinker. Built using Flask and React.")
    c.drawString(100, 470, "Project 2: Database Optimizer. Tuned SQL queries for faster fetching.")
    c.save()

if __name__ == '__main__':
    create_pdf("mock_resume.pdf")
    print("Mock PDF resume generated successfully!")
