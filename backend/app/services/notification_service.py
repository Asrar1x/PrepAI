import logging
# In production, you would import a library like resend or smtplib
# import resend

logger = logging.getLogger(__name__)

# resend.api_key = "re_123456789" # Mock API key

async def send_interview_report_email(user_email: str, user_name: str, report_url: str):
    """
    Mock email service to send the PDF report link to the student.
    """
    subject = "Your PrepAI Interview Feedback Report is Ready!"
    
    html_content = f"""
    <html>
      <body>
        <h2>Hello {user_name},</h2>
        <p>Great job completing your mock interview.</p>
        <p>Our AI has evaluated your performance and generated a detailed feedback report.</p>
        <p>You can download and view your PDF report here:</p>
        <a href="http://localhost:8000{report_url}" style="display:inline-block;padding:10px 20px;background-color:#4f46e5;color:white;text-decoration:none;border-radius:5px;">Download Report</a>
        <br><br>
        <p>Keep up the good work and maintain your streak!</p>
        <p>- The PrepAI Team</p>
      </body>
    </html>
    """
    
    # Mocking the send request
    logger.info(f"========== EMAIL SENT TO {user_email} ==========")
    logger.info(f"Subject: {subject}")
    logger.info(f"Body: {html_content}")
    logger.info("================================================")
    
    # If using Resend:
    # resend.Emails.send({
    #     "from": "onboarding@resend.dev",
    #     "to": user_email,
    #     "subject": subject,
    #     "html": html_content
    # })
    
    return True
