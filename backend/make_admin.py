from app import app
from extensions import db
from models import User

def make_admin(email):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.role = "admin"
            db.session.commit()
            print(f"User {email} is now an admin.")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    make_admin("test@example.com")
