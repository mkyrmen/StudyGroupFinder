from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from extensions import db
from models import Group, GroupMembers, GroupMessage, GroupMeeting, User

groups_bp = Blueprint("groups", __name__)

@groups_bp.route("", methods=["GET", "POST"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def manage_groups():
    """
    Handles listing all groups (GET) and creating a new group (POST).
    Wrapped in try/except so backend errors are returned as JSON instead of
    causing a silent 500 with no message.
    """
    try:
        if request.method == "POST":
            data = request.get_json() or {}

            name = data.get("name")
            subject = data.get("subject")
            description = data.get("description")
            creator_id = data.get("creator_id")

            if not name or not subject or not creator_id:
                return jsonify({"error": "Name, subject, and creator_id are required"}), 400

            # Generate a unique 6-character invitation code
            import string
            import random

            invitation_code = "".join(
                random.choices(string.ascii_uppercase + string.digits, k=6)
            )

            # Ensure uniqueness (simple loop)
            while Group.query.filter_by(invitation_code=invitation_code).first():
                invitation_code = "".join(
                    random.choices(string.ascii_uppercase + string.digits, k=6)
                )

            new_group = Group(
                name=name,
                subject=subject,
                description=description,
                creator_id=creator_id,
                invitation_code=invitation_code,
            )

            db.session.add(new_group)
            db.session.commit()

            # Add creator as the first member
            membership = GroupMembers(user_id=creator_id, group_id=new_group.id)
            db.session.add(membership)
            db.session.commit()

            return (
                jsonify(
                    {
                        "message": "Group created successfully",
                        "group": {
                            "id": new_group.id,
                            "name": new_group.name,
                            "subject": new_group.subject,
                            "invitation_code": new_group.invitation_code,
                        },
                    }
                ),
                201,
            )

        # GET request
        groups = Group.query.all()
        groups_list = []
        for g in groups:
            groups_list.append(
                {
                    "id": g.id,
                    "name": g.name,
                    "subject": g.subject,
                    "description": g.description,
                    "members_count": g.members_count,
                    "creator_id": g.creator_id,
                    "creator_name": g.creator.name if g.creator else "Unknown",
                    "creator_email": g.creator.email if g.creator else "",
                    "created_at": g.created_at.isoformat() if g.created_at else None,
                }
            )

        return jsonify(groups_list), 200
    except Exception as e:
        # This will show up in the terminal and the response body
        print("Error in /api/groups:", e)
        return jsonify({"error": str(e)}), 500

@groups_bp.route("/<int:group_id>", methods=["GET", "DELETE"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def group_item(group_id):
    """
    Handles fetching group details (GET) and deleting a group (DELETE).
    """
    try:
        group = Group.query.get_or_404(group_id)

        if request.method == "DELETE":
            # For this testcase, we'll allow deletion without strict auth for now
            # but ideally we'd check if creator or admin
            db.session.delete(group)
            db.session.commit()
            return "", 204

        # GET request (rest of existing get_group_details logic)
        return get_group_details(group_id)
    except Exception as e:
        print(f"Error in /api/groups/{group_id}:", e)
        return jsonify({"error": str(e)}), 500

@groups_bp.route("/join", methods=["POST"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def join_group():
    """
    Join a group using an invitation code.
    Wrapped in try/except so errors are returned as JSON.
    """
    try:
        data = request.get_json() or {}
        user_id = data.get("user_id")
        invitation_code = data.get("invitation_code")

        if not user_id or not invitation_code:
            return (
                jsonify({"error": "User ID and invitation code are required"}),
                400,
            )

        group = Group.query.filter_by(invitation_code=invitation_code).first()
        if not group:
            return jsonify({"error": "Invalid invitation code"}), 404

        # Check if already a member
        from models import GroupMembers

        existing_membership = GroupMembers.query.filter_by(
            user_id=user_id, group_id=group.id
        ).first()
        if existing_membership:
            return (
                jsonify({"error": "You are already a member of this group"}),
                400,
            )

        new_membership = GroupMembers(user_id=user_id, group_id=group.id)
        db.session.add(new_membership)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Successfully joined the group",
                    "group": {
                        "id": group.id,
                        "name": group.name,
                        "subject": group.subject,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        print("Error in /api/groups/join:", e)
        return jsonify({"error": str(e)}), 500

@groups_bp.route("/<int:group_id>", methods=["GET"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def get_group_details(group_id):
    """
    Return group details, members, messages, and meetings.
    """
    group = Group.query.get_or_404(group_id)

    # Members
    members = []
    for member in group.members:
        members.append({"id": member.id, "name": member.name})

    # Messages
    messages = (
        GroupMessage.query.filter_by(group_id=group.id)
        .order_by(GroupMessage.created_at.asc())
        .all()
    )
    messages_list = []
    for m in messages:
        messages_list.append(
            {
                "id": m.id,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "author": {
                    "id": m.author.id,
                    "name": m.author.name,
                }
                if m.author
                else None,
            }
        )

    # Meetings
    meetings = (
        GroupMeeting.query.filter_by(group_id=group.id)
        .order_by(GroupMeeting.scheduled_for.asc())
        .all()
    )
    meetings_list = []
    for mt in meetings:
        creator = User.query.get(mt.created_by) if mt.created_by else None
        meetings_list.append(
            {
                "id": mt.id,
                "title": mt.title,
                "scheduled_for": mt.scheduled_for,
                "created_by": mt.created_by,
                "created_by_name": creator.name if creator else None,
            }
        )

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "subject": group.subject,
                "description": group.description,
                "invitation_code": group.invitation_code,
                "creator_id": group.creator_id,
                "members_count": group.members_count,
                "members": members,
                "messages": messages_list,
                "meetings": meetings_list,
            }
        ),
        200,
    )


@groups_bp.route("/<int:group_id>/messages", methods=["GET", "POST"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def group_messages(group_id):
    """
    List or create messages in a group.
    """
    try:
        group = Group.query.get_or_404(group_id)

        if request.method == "GET":
            messages = (
                GroupMessage.query.filter_by(group_id=group.id)
                .order_by(GroupMessage.created_at.asc())
                .all()
            )
            result = []
            for m in messages:
                result.append(
                    {
                        "id": m.id,
                        "content": m.content,
                        "created_at": m.created_at.isoformat()
                        if m.created_at
                        else None,
                        "author": {
                            "id": m.author.id,
                            "name": m.author.name,
                        }
                        if m.author
                        else None,
                    }
                )
            return jsonify({"messages": result}), 200

        # POST - create message
        data = request.get_json() or {}
        user_id = data.get("user_id")
        content = data.get("content", "").strip()

        if not user_id or not content:
            return jsonify({"error": "user_id and content are required"}), 400

        msg = GroupMessage(group_id=group.id, user_id=user_id, content=content)
        db.session.add(msg)
        db.session.commit()

        author = User.query.get(user_id)
        return (
            jsonify(
                {
                    "message": {
                        "id": msg.id,
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat()
                        if msg.created_at
                        else None,
                        "author": {
                            "id": author.id,
                            "name": author.name,
                        }
                        if author
                        else None,
                    }
                }
            ),
            201,
        )
    except Exception as e:
        print("Error in /api/groups/<id>/messages:", e)
        return jsonify({"error": str(e)}), 500


@groups_bp.route("/<int:group_id>/meetings", methods=["GET", "POST"])
@cross_origin(origins="http://localhost:5173", supports_credentials=True)
def group_meetings(group_id):
    """
    List or create meetings for a group.
    """
    try:
        group = Group.query.get_or_404(group_id)

        if request.method == "GET":
            meetings = (
                GroupMeeting.query.filter_by(group_id=group.id)
                .order_by(GroupMeeting.scheduled_for.asc())
                .all()
            )
            result = []
            for mt in meetings:
                creator = (
                    User.query.get(mt.created_by) if mt.created_by else None
                )
                result.append(
                    {
                        "id": mt.id,
                        "title": mt.title,
                        "scheduled_for": mt.scheduled_for,
                        "created_by": mt.created_by,
                        "created_by_name": creator.name if creator else None,
                    }
                )
            return jsonify({"meetings": result}), 200

        # POST - create meeting
        data = request.get_json() or {}
        user_id = data.get("user_id")
        title = (data.get("title") or "").strip()
        scheduled_for = (data.get("scheduled_for") or "").strip()

        if not user_id or not title or not scheduled_for:
            return (
                jsonify(
                    {"error": "user_id, title, and scheduled_for are required"}
                ),
                400,
            )

        mt = GroupMeeting(
            group_id=group.id,
            title=title,
            scheduled_for=scheduled_for,
            created_by=user_id,
        )
        db.session.add(mt)
        db.session.commit()

        creator = User.query.get(user_id)
        return (
            jsonify(
                {
                    "meeting": {
                        "id": mt.id,
                        "title": mt.title,
                        "scheduled_for": mt.scheduled_for,
                        "created_by": mt.created_by,
                        "created_by_name": creator.name if creator else None,
                    }
                }
            ),
            201,
        )
    except Exception as e:
        print("Error in /api/groups/<id>/meetings:", e)
        return jsonify({"error": str(e)}), 500
