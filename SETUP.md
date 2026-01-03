# Default HR User Setup

This guide will help you set up the default HR user for the Dayflow payroll system.

## Prerequisites

1. Get your Supabase Service Role Key from your Supabase project:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Find the `service_role` key under "Project API keys"
   - Copy this key

## Setup Steps

### 1. Add Service Role Key to Environment

Add your Supabase Service Role Key to the `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
```

### 2. Install Dependencies

Install the required dependencies for the setup script:

```bash
npm install
```

### 3. Run Setup Script

Execute the setup script to create the default HR user:

```bash
npm run setup-hr
```

## Default HR Credentials

After running the setup script, you can login with:

- **Email:** `hr@dayflow.com`
- **Password:** `hradmin123`
- **Role:** HR Administrator
- **Department:** Human Resources
- **Position:** HR Manager

## What the Script Does

The setup script performs the following actions:

1. **Creates Supabase Auth User**: Creates a user in Supabase authentication system
2. **Creates Profile Record**: Adds the user's profile information to the `profiles` table
3. **Assigns HR Role**: Assigns the 'hr' role in the `user_roles` table
4. **Sets Default Values**: Configures default leave balances and status

## Troubleshooting

### User Already Exists

If the HR user already exists, the script will detect this and proceed with updating the profile and role records.

### Permission Denied

Make sure you're using the correct Service Role Key, not the publishable key. The Service Role Key has admin privileges needed to create users.

### Script Fails

Check that:
- Your Supabase URL is correct in the `.env` file
- You have the correct Service Role Key
- Your Supabase project has the required tables (`profiles`, `user_roles`)

## Usage

Once setup is complete, you can:

1. Start the development server: `npm run dev`
2. Navigate to the login page
3. Use the default HR credentials to login
4. Access all HR features including employee management, payroll, and leave approval

The credentials are also displayed on the login page for easy reference during development.
