from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime
from config import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash # Import check_password_hash
import traceback # Import traceback for detailed error logging

# Serve static files from the root URL path '/' instead of the default '/static'
app = Flask(__name__, template_folder='..', static_folder='..', static_url_path='')
CORS(app)

@app.route('/register', methods=['POST'])
def register():
    print("\n--- Received /register request ---")
    conn = None
    cursor = None
    try:
        data = request.get_json()
        print(f"Registration data received: {data}")

        if not data or not all(key in data for key in ['username', 'email', 'password']):
            print("Registration failed: Missing required fields")
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        username = data['username']
        email = data['email']
        password = data['password']

        # Hash the password
        hashed_password = generate_password_hash(password)
        print(f"Password hashed for user: {username}")

        print("Attempting DB connection...")
        conn = get_db_connection()
        cursor = conn.cursor(prepared=True)
        print("DB connection successful.")

        # Check if username or email already exists
        check_sql = "SELECT id FROM users WHERE username = %s OR email = %s"
        print(f"Executing check query: {check_sql} with params ({username}, {email})")
        cursor.execute(check_sql, (username, email))
        existing_user = cursor.fetchone()

        if existing_user:
            print(f"User already exists: {username} / {email}")
            return jsonify({'success': False, 'message': 'Username or email already exists'}), 409 # 409 Conflict
        else:
             print(f"User {username} does not exist. Proceeding with insertion.")

        # Insert new user
        insert_sql = """
            INSERT INTO users (username, email, password)
            VALUES (%s, %s, %s)
        """
        print(f"Executing insert query: {insert_sql.strip()} with params ({username}, {email}, ***hashed_password***)")
        cursor.execute(insert_sql, (username, email, hashed_password))
        print("Insert query executed.")

        print("Attempting to commit transaction...")
        conn.commit()
        print("Transaction committed successfully.")

        return jsonify({'success': True, 'message': 'User registered successfully'}), 201 # 201 Created

    except Exception as e:
        # Log the detailed error
        print(f"!!! Error during registration: {str(e)}")
        print(traceback.format_exc()) # Print full traceback
        if conn:
            print("Rolling back transaction due to error.")
            conn.rollback() # Rollback on error
        return jsonify({'success': False, 'message': f'Error registering user: {str(e)}'}), 500

    finally:
        print("Closing cursor and connection (if open).")
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("--- End /register request ---")


@app.route('/login', methods=['POST'])
def login():
    print("\n--- Received /login request ---")
    conn = None
    cursor = None
    try:
        data = request.get_json()
        print(f"Login data received: {data}")

        if not data or not all(key in data for key in ['username', 'password']):
            print("Login failed: Missing required fields")
            return jsonify({'success': False, 'message': 'Missing username or password'}), 400

        username = data['username']
        password = data['password']

        print("Attempting DB connection...")
        conn = get_db_connection()
        # Use dictionary cursor to access columns by name
        cursor = conn.cursor(dictionary=True, prepared=True) 
        print("DB connection successful.")

        # Find user by username
        sql = "SELECT id, username, password FROM users WHERE username = %s"
        print(f"Executing user lookup query: {sql} with params ({username},)")
        cursor.execute(sql, (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password'], password):
            # Password matches
            print(f"Login successful for user: {username} (ID: {user['id']})")
            # Return user info (excluding password)
            return jsonify({
                'success': True, 
                'message': 'Login successful',
                'user': {
                    'id': user['id'],
                    'username': user['username']
                    # Add other user details if needed, e.g., email
                }
            }), 200
        else:
            # User not found or password incorrect
            print(f"Login failed for user: {username}. User found: {bool(user)}. Password match: {check_password_hash(user['password'], password) if user else 'N/A'}")
            return jsonify({'success': False, 'message': 'Invalid username or password'}), 401 # Unauthorized

    except Exception as e:
        print(f"!!! Error during login: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': f'Error during login: {str(e)}'}), 500

    finally:
        print("Closing cursor and connection (if open).")
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("--- End /login request ---")

@app.route('/courses', methods=['GET', 'POST'])
def handle_courses():
    conn = None
    cursor = None
    # TODO: Add proper authentication check here (e.g., check session/token)
    # For now, we'll assume user_id is passed in request for POST, 
    # or handle GET without user context (needs improvement)
    
    if request.method == 'POST':
        print("\n--- Received POST /courses request ---")
        try:
            data = request.get_json()
            print(f"Course data received: {data}")

            # Assuming user_id is sent in the request body for now
            # A better approach would be to get it from a session/token
            if not data or not all(key in data for key in ['course_name', 'course_code', 'user_id']):
                print("Add course failed: Missing required fields")
                return jsonify({'success': False, 'message': 'Missing required fields (course_name, course_code, user_id)'}), 400

            course_name = data['course_name']
            course_code = data['course_code']
            user_id = data['user_id'] # Get user_id from request

            print("Attempting DB connection...")
            conn = get_db_connection()
            cursor = conn.cursor(prepared=True)
            print("DB connection successful.")

            # 1. Insert into courses table (handle potential duplicates)
            course_id = None
            try:
                insert_course_sql = "INSERT INTO courses (course_name, course_code) VALUES (%s, %s)"
                print(f"Executing course insert query: {insert_course_sql} with params ({course_name}, {course_code})")
                cursor.execute(insert_course_sql, (course_name, course_code))
                course_id = cursor.lastrowid # Get the ID of the inserted course
                print(f"Course inserted with ID: {course_id}")
            except mysql.connector.IntegrityError as ie:
                # If course code already exists, find its ID
                if ie.errno == 1062: # Duplicate entry error code
                    print(f"Course code '{course_code}' already exists. Finding existing course ID.")
                    find_course_sql = "SELECT id FROM courses WHERE course_code = %s"
                    cursor.execute(find_course_sql, (course_code,))
                    result = cursor.fetchone()
                    if result:
                        course_id = result[0]
                        print(f"Found existing course ID: {course_id}")
                    else:
                        # This case should ideally not happen if IntegrityError was raised for course_code
                        raise Exception(f"IntegrityError for duplicate course_code '{course_code}', but could not find existing course.")
                else:
                    raise # Re-raise other integrity errors

            if not course_id:
                 raise Exception("Failed to get course ID after insert/check.")

            # 2. Insert into user_courses table (link user to course)
            try:
                link_sql = "INSERT INTO user_courses (user_id, course_id) VALUES (%s, %s)"
                print(f"Executing user_courses link query: {link_sql} with params ({user_id}, {course_id})")
                cursor.execute(link_sql, (user_id, course_id))
                print("User linked to course successfully.")
            except mysql.connector.IntegrityError as ie:
                 if ie.errno == 1062: # Duplicate entry
                     print("User is already enrolled in this course.")
                     # Not necessarily an error, maybe return a specific message
                 else:
                     raise # Re-raise other integrity errors
            
            print("Attempting to commit transaction...")
            conn.commit()
            print("Transaction committed successfully.")

            return jsonify({'success': True, 'message': 'Course added and linked successfully', 'course_id': course_id}), 201

        except Exception as e:
            print(f"!!! Error adding course: {str(e)}")
            print(traceback.format_exc())
            if conn:
                print("Rolling back transaction due to error.")
                conn.rollback()
            return jsonify({'success': False, 'message': f'Error adding course: {str(e)}'}), 500
        finally:
            print("Closing cursor and connection (if open).")
            if cursor: cursor.close()
            if conn: conn.close()
            print("--- End POST /courses request ---")

    elif request.method == 'GET':
        print("\n--- Received GET /courses request ---")
        user_id = request.args.get('user_id') # Get user_id from query parameter

        if not user_id:
            print("Get courses failed: Missing user_id query parameter")
            return jsonify({'success': False, 'message': 'Missing user_id query parameter'}), 400
            
        try:
            user_id = int(user_id) # Ensure user_id is an integer
        except ValueError:
            print("Get courses failed: Invalid user_id format")
            return jsonify({'success': False, 'message': 'Invalid user_id format'}), 400

        try:
            print(f"Fetching courses for user_id: {user_id}")
            print("Attempting DB connection...")
            conn = get_db_connection()
            # Use dictionary cursor to get results as dicts
            cursor = conn.cursor(dictionary=True, prepared=True) 
            print("DB connection successful.")

            sql = """
                SELECT c.id, c.course_code, c.course_name 
                FROM courses c 
                JOIN user_courses uc ON c.id = uc.course_id 
                WHERE uc.user_id = %s
            """
            print(f"Executing course fetch query: {sql.strip()} with params ({user_id},)")
            cursor.execute(sql, (user_id,))
            courses = cursor.fetchall()
            print(f"Found {len(courses)} courses for user {user_id}.")

            return jsonify({'success': True, 'courses': courses}), 200

        except Exception as e:
            print(f"!!! Error fetching courses: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'success': False, 'message': f'Error fetching courses: {str(e)}'}), 500
        finally:
            print("Closing cursor and connection (if open).")
            if cursor: cursor.close()
            if conn: conn.close()
            print("--- End GET /courses request ---")


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/mark-attendance', methods=['POST'])
def mark_attendance():
    print("\n--- Received /mark-attendance request ---")
    conn = None
    cursor = None
    try:
        data = request.get_json()
        print(f"Attendance data received: {data}")

        if not data or not all(key in data for key in ['userId', 'courseId']):
            print("Attendance marking failed: Missing required data")
            return jsonify({'success': False, 'message': 'Missing required data'}), 400

        user_id = data['userId']
        course_id = data['courseId']
        current_date = datetime.now().strftime('%Y-%m-%d')
        current_time = datetime.now().strftime('%H:%M:%S')
        print(f"Processing attendance for User ID: {user_id}, Course ID: {course_id}, Date: {current_date}, Time: {current_time}")

        print("Attempting DB connection...")
        conn = get_db_connection()
        cursor = conn.cursor(prepared=True)
        print("DB connection successful.")

        # Check if attendance already marked
        check_sql = """
            SELECT id FROM attendance
            WHERE user_id = %s AND course_id = %s AND attendance_date = %s
        """
        print(f"Executing check query: {check_sql.strip()} with params ({user_id}, {course_id}, {current_date})")
        cursor.execute(check_sql, (user_id, course_id, current_date))
        result = cursor.fetchone()

        if result:
            print("Attendance already marked for today.")
            return jsonify({
                'success': False,
                'message': 'Attendance already marked for today'
            }), 400
        else:
            print("Attendance not marked yet today. Proceeding with insertion.")

        # Insert new attendance record
        insert_sql = """
            INSERT INTO attendance (user_id, course_id, attendance_date, check_in_time)
            VALUES (%s, %s, %s, %s)
        """
        print(f"Executing insert query: {insert_sql.strip()} with params ({user_id}, {course_id}, {current_date}, {current_time})")
        cursor.execute(insert_sql, (user_id, course_id, current_date, current_time))
        print("Insert query executed.")

        print("Attempting to commit transaction...")
        conn.commit()
        print("Transaction committed successfully.")

        return jsonify({
            'success': True,
            'message': 'Attendance marked successfully'
        })

    except Exception as e:
        print(f"!!! Error marking attendance: {str(e)}")
        print(traceback.format_exc()) # Print full traceback
        if conn:
            print("Rolling back transaction due to error.")
            conn.rollback() # Rollback on error
        return jsonify({
            'success': False,
            'message': f'Error marking attendance: {str(e)}'
        }), 500

    finally:
        print("Closing cursor and connection (if open).")
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("--- End /mark-attendance request ---")


if __name__ == '__main__':
    # Ensure the host is set to '0.0.0.0' to be accessible on the network if needed,
    # but keep '127.0.0.1' for local-only access.
    print("Starting Flask server...")
    app.run(host='127.0.0.1', port=5501, debug=True)
