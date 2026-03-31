from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    last_login_at = db.Column(db.DateTime)
    last_seen_at = db.Column(db.DateTime)

    # Relationships
    groups_joined = db.relationship("Group", secondary="group_members", backref=db.backref("members", lazy="dynamic"))

    def __repr__(self):
        return f"<User {self.email}>"

class Group(db.Model):
    __tablename__ = "groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    invitation_code = db.Column(db.String(10), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    creator = db.relationship("User", backref=db.backref("groups_created", lazy=True))

    @property
    def members_count(self):
        return self.members.count()

    def __repr__(self):
        return f"<Group {self.name}>"

class GroupMembers(db.Model):
    __tablename__ = "group_members"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    joined_at = db.Column(db.DateTime, server_default=db.func.now())


class GroupMessage(db.Model):
    __tablename__ = "group_messages"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    author = db.relationship("User")


class GroupMeeting(db.Model):
    __tablename__ = "group_meetings"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    # Store a simple date/time string like "2026-03-05 18:00"
    scheduled_for = db.Column(db.String(50), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
