# Collegram

> A unified campus communication and student services platform for
> students and faculty.

> Live Preview Avaible here : https://collegram.netlify.app/

## Overview

**Collegram** is a college-focused digital platform designed to simplify
everyday student–faculty interactions.

The platform provides two dedicated experiences:

- **Student Portal** — submit institutional requests, make payments,
  view faculty posts and events, and track personal activity.
- **Teacher Portal** — review and manage student requests, publish
  announcements/events, and maintain a faculty profile.

The goal is to bring commonly used college services into one simple,
organized, and easy-to-use application.

------------------------------------------------------------------------

## Key Features

### Student Portal

#### 1. Campus Home

The student home page provides a central place to view:

- Faculty announcements
- College events
- Posters and important updates
- Other posts shared by teachers

#### 2. Requests

Students can submit different types of requests through structured
forms:

- Leave Request
- Faculty/Teacher Meeting Request
- HOD / Principal Request
- Certificate Request
- Permission Request

Each request includes an **appointment date range (From – To)** where
applicable.

After submission, the student can track the request status from their
profile.

#### 3. Payments

The payment module allows students to make college-related payments
through a simple flow:

1.  Enter student details
2.  Enter the payment amount
3.  Add remarks
4.  Generate/display the payment QR
5.  Complete the payment
6.  Show payment success confirmation
7.  Generate a receipt number

Payment information can also be reflected in the student’s profile.

#### 4. Student Profile

The profile page provides an overview of the student’s information and
activity, including:

- Name
- Roll Number
- Branch
- Email
- Payment status
- Pending requests
- Other relevant student details

------------------------------------------------------------------------

### Teacher Portal

#### 1. Request Management

Teachers can view requests submitted by students and take action on
them.

Available actions include:

- **Approve**
- **Ignore / Reject**

Request details can be opened before taking an action.

#### 2. Posts & Announcements

Teachers can publish content that appears on the student home page, such
as:

- Announcements
- Posters
- General updates
- Important notices
- Campus information

#### 3. Events

Teachers can create and share college events so that students can
discover upcoming activities directly from the home page.

#### 4. Teacher Profile

Faculty members have a dedicated profile section for viewing their
account and professional information.

------------------------------------------------------------------------

## User Flow

### Student Flow

``` text
Login
  ↓
Student Home
  ├── View Faculty Posts & Events
  │
  ├── Requests
  │     ├── Leave
  │     ├── Meeting
  │     ├── HOD / Principal
  │     ├── Certificate
  │     └── Permission
  │            ↓
  │       Appointment Date From / To
  │            ↓
  │       Submit Request
  │
  ├── Payments
  │     ↓
  │   Payment Form
  │     ↓
  │   QR Code
  │     ↓
  │   Payment Completed
  │     ↓
  │   Success + Receipt Number
  │
  └── Profile
        ├── Student Details
        ├── Payment Status
        └── Pending Requests
```

### Teacher Flow

``` text
Login
  ↓
Teacher Home
  ├── Student Requests
  │     ↓
  │   View Request Details
  │     ↓
  │   Approve / Ignore
  │
  ├── Create Post
  │     ↓
  │   Published to Student Home
  │
  ├── Create Event
  │     ↓
  │   Published to Student Home
  │
  └── Teacher Profile
```

------------------------------------------------------------------------

## Main Modules

| Module         |    Student     |     Teacher     |
|----------------|:--------------:|:---------------:|
| Home / Feed    |       ✓        |        ✓        |
| Faculty Posts  |      View      | Create & Manage |
| Events         |      View      | Create & Manage |
| Requests       | Create & Track | Review & Action |
| Payments       |  Make Payment  |        —        |
| Payment Status |      View      |        —        |
| Profile        |       ✓        |        ✓        |

------------------------------------------------------------------------

## Request Types

| Request         | Purpose                                            |
|-----------------|----------------------------------------------------|
| Leave           | Submit a leave request                             |
| Meeting         | Request an appointment/meeting                     |
| HOD / Principal | Submit a request to higher academic administration |
| Certificate     | Request a college certificate                      |
| Permission      | Request permission for a college-related activity  |

------------------------------------------------------------------------

## Payment Flow

``` text
Student Details
      ↓
Payment Amount
      ↓
Remarks
      ↓
Generate QR
      ↓
Complete UPI Payment
      ↓
Payment Success
      ↓
Receipt Number
```

The payment interface is designed to keep the process clear and minimize
unnecessary steps for students.

------------------------------------------------------------------------

## Design Principles

Collegram follows a clean, modern campus-app experience with a focus on:

- **Simplicity** — important actions should be easy to find.
- **Clarity** — forms and statuses should be understandable at a glance.
- **Role-based experience** — students and teachers see features
  relevant to their responsibilities.
- **Consistency** — common navigation and UI patterns are used
  throughout the application.
- **Mobile-first usability** — key student workflows are optimized for
  mobile interaction.
- **Professional visual design** — cards, forms, status indicators, and
  actions are organized into a consistent interface.

------------------------------------------------------------------------

## Project Structure

A suggested high-level structure for the application is:

``` text
Collegram/
├── student/
│   ├── home
│   ├── requests
│   ├── payments
│   └── profile
│
├── teacher/
│   ├── home
│   ├── requests
│   ├── posts
│   ├── events
│   └── profile
│
├── components/
├── assets/
├── services/
└── README.md
```

> The exact folder structure may vary depending on the implementation
> technology and deployment architecture.

------------------------------------------------------------------------

## Future Enhancements

Potential future improvements include:

- Push notifications for request status changes
- Payment history and downloadable receipts
- Request history with detailed status tracking
- Search and filtering for requests and posts
- Faculty-specific posting permissions
- Role-based authentication and authorization
- Admin/HOD dashboard
- Student–faculty messaging
- Document upload for requests
- Analytics and reporting
- Web and Android synchronization
- Secure online payment gateway integration

------------------------------------------------------------------------

## Security & Privacy

Collegram should be designed with student and faculty data protection in
mind.

Recommended security measures include:

- Role-based access control
- Secure authentication
- Server-side validation
- Protected student and payment information
- Secure payment processing
- Input sanitization
- Audit logs for important request/payment actions

Payment credentials or sensitive payment information should **never be
stored directly by the application** unless required by a compliant
payment provider and handled according to applicable security standards.

------------------------------------------------------------------------

## Project Goals

The primary goals of Collegram are to:

1.  Reduce manual paperwork for common college requests.
2.  Make student requests easier to submit and track.
3.  Simplify college-related payments.
4.  Improve communication between students and faculty.
5.  Provide a centralized place for college announcements and events.
6.  Give teachers an efficient way to manage requests and publish
    updates.

------------------------------------------------------------------------

## Who Is Collegram For?

### Students

Students can use Collegram to:

- Submit requests
- Track pending requests
- Make payments
- View payment status
- Receive faculty announcements
- Discover college events
- Manage their profile

### Teachers / Faculty

Faculty can use Collegram to:

- Review student requests
- Approve or ignore requests
- Publish announcements
- Share posters
- Create events
- Maintain their faculty profile

------------------------------------------------------------------------

## Project Status

**Status:** In Development

Collegram is being developed as a college-focused student and faculty
service platform. Features and workflows may evolve as the project
progresses.

------------------------------------------------------------------------

## Conclusion

**Collegram** aims to make college administration more accessible,
organized, and digital by connecting student services and faculty
communication in one platform.

Instead of depending on separate processes for requests, payments,
announcements, and events, Collegram brings these essential campus
interactions together in a single experience.

------------------------------------------------------------------------

## Author

**Supriya Mare**

B.Tech – Computer Science and Engineering (Data Science)

**Project:** Collegram — Campus Student & Faculty Platform
