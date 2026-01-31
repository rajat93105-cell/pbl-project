# MUJ Campus Marketplace - PRD

## Original Problem Statement
Build a professional, scalable Campus Marketplace website for Manipal University Jaipur (MUJ) using MERN-like stack. Create a clean, trustworthy, student-friendly marketplace where MUJ students can buy & sell only relevant campus items.

## User Personas
1. **Student Seller**: MUJ student wanting to sell items when leaving campus or upgrading
2. **Student Buyer**: MUJ student looking for affordable second-hand items

## Core Requirements (Static)
- JWT authentication with @muj.manipal.edu email restriction
- 4 curated categories: Room Essentials, Books & Study Material, Electronics, Other Useful Stuff
- Product listing with images, price, condition, description
- Search and category filtering
- Wishlist functionality
- Dark mode default with light mode toggle

## What's Been Implemented (Jan 31, 2026)

### Backend (FastAPI + MongoDB)
- ✅ User authentication (register/login with MUJ email validation)
- ✅ JWT token-based auth with protected routes
- ✅ Product CRUD operations with seller ownership checks
- ✅ Wishlist add/remove functionality
- ✅ Category and search filtering with pagination
- ✅ Cloudinary signature endpoint for image uploads (placeholder credentials)
- ✅ Profile update endpoint

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Landing page with hero, categories, features, CTA sections
- ✅ Login/Signup pages with MUJ email validation
- ✅ Marketplace page with search, category filters, product grid
- ✅ Product detail page with seller info, contact via email
- ✅ Add/Edit Product forms with image upload
- ✅ My Listings dashboard with edit/delete
- ✅ Wishlist page
- ✅ Profile page with name update
- ✅ Dark/Light theme toggle with localStorage persistence
- ✅ Responsive design (mobile/tablet/desktop)

### Design Implementation
- Neo-Glass aesthetic with violet/blue gradient theme
- Glassmorphism cards with backdrop blur
- Outfit font for headings, DM Sans for body
- Framer Motion animations
- Lucide React icons

## Prioritized Backlog

### P0 (Critical) - None remaining
All core functionality implemented

### P1 (Important)
- Real Cloudinary credentials for production image upload
- Email verification for new registrations
- Password reset functionality

### P2 (Nice to Have)
- Buyer-seller chat system
- Price negotiation feature
- Push notifications for wishlist price drops
- Product ratings/reviews
- Admin dashboard for content moderation

## Next Action Items
1. Add real Cloudinary credentials in .env for production
2. Consider adding email verification flow
3. Implement password reset functionality
4. Add more products by actual MUJ students
