from io import BytesIO
import logging
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

logger = logging.getLogger(__name__)

class PDFService:
    def generate_portfolio_pdf(self, student_data: dict) -> bytes:
        """Generate a simple PDF portfolio for a student."""
        try:
            buffer = BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            c.setFont("Helvetica-Bold", 16)
            
            student_id = student_data.get("student_id", "Student")
            c.drawString(72, 720, f"MissionX Labs Portfolio: {student_id}")
            
            c.setFont("Helvetica", 12)
            y_position = 680
            
            stats = student_data.get("stats", {})
            c.drawString(72, y_position, f"Missions Completed: {stats.get('missions_completed', 0)}")
            y_position -= 20
            c.drawString(72, y_position, f"Total XP: {stats.get('total_xp', 0)}")
            y_position -= 40
            
            c.setFont("Helvetica-Bold", 14)
            c.drawString(72, y_position, "Verified PRs:")
            y_position -= 20
            
            c.setFont("Helvetica", 12)
            for pr in student_data.get("history", []):
                c.drawString(72, y_position, f"- {pr.get('repo')}: {pr.get('pr')} ({pr.get('xp')} XP)")
                y_position -= 20
                if y_position < 100:
                    c.showPage()
                    y_position = 750
            
            y_position -= 20
            c.setFont("Helvetica-Bold", 14)
            c.drawString(72, y_position, "Badges Earned:")
            y_position -= 20
            
            c.setFont("Helvetica", 12)
            for badge in student_data.get("badges", []):
                c.drawString(72, y_position, f"- {badge.get('name')}")
                y_position -= 20
                
            c.save()
            
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise e

pdf_service = PDFService()
