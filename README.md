# Cortex

Cortex is a secure, content-sharing backend built with TypeScript, Express, Prisma, and JWT-based authentication. Users can sign up, create and manage content with tags, and share their content with public links.


## Features

- JWT-based authentication (Passport.js)
- Create, read, update, and delete user content
- Tag-based categorization
- Secure public sharing of user content
- Input validation using Zod
- Built with PostgreSQL and Prisma ORM


## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Authentication:** Passport.js (Local & JWT)
- **ORM:** Prisma + PostgreSQL
- **Validation:** Zod
- **Utilities:** Crypto for secure hash generation


## Setup

### Clone the Repo
```bash
git clone https://github.com/chintondutta/cortex.git
cd cortex
```
### Install Dependencies
```bash
npm install
```
### Create .env File
DATABASE_URL=your_postgreSQL_url_here
JWT_SECRET=your_jwt_secret_here

### Start Dev Server
```bash
npm run dev
```
## Testing Guide

1. POST /signup
    ```json
    {
    "username": "johndoe",
    "password": "securepassword"
    }
    ```
2. POST /signin
    ```json
    {
    "username": "johndoe",
    "password": "securepassword"
    }
    ```
    Response
    ```json
    {
    "token": "jwt_token_here"
    }
    ```
All routes below require Authorization: Bearer <token>

3. POST /content
    ```json
    {
    "title": "My favorite article",
    "link": "https://example.com/article",
    "type": "article",
    "tags": ["tagId1", "tagId2"]
    }
    ```
4. GET /content
    ```json
    [
    {
        "id": "contentId",
        "title": "My favorite article",
        "link": "https://example.com/article",
        "type": "article",
        "tags": [
        { "title": "technology" },
        { "title": "education" }
        ]
    }
    ]
    ```
5. PUT /content/:id
    ```json
    {
    "title": "Updated title",
    "link": "https://example.com/updated",
    "type": "video",
    "tags": ["tagId3"]
    }
    ```
6. DELETE /content/:id

7. POST /brain/share
    ```json
    {
    "share": true
    }
    ```
    If true, a public link will be generated. If false, sharing will be disabled.

8. GET /brain/:shareLink
    ```json
    {
    "contents": [
        {
        "title": "Public Post",
        "link": "https://example.com",
        "type": "image",
        "tags": [
            { "title": "art" }
        ]
        }
    ]
    }
    ```
