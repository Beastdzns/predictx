# Blink Custom Cards Feature

## Overview
This feature allows users to create beautifully designed, customizable payment cards for Blink payment requests. These cards are perfect for tips, donations, payments, and more.

## Setup Instructions

### 1. MongoDB Atlas Configuration

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (free tier is fine for development)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string (looks like: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>`)

### 2. Environment Variables

Update your `.env.local` file with your MongoDB Atlas connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

Replace:
- `<username>`: Your MongoDB database username
- `<password>`: Your MongoDB database password
- `<cluster>`: Your cluster address
- `<database>`: Your database name (e.g., "plinks" or "blinks")

### 3. Start the Development Server

```bash
pnpm dev
```

## Features

### Card Customization
- **Card Types**: Tip, Donation, Payment, or Custom
- **Title & Description**: Fully editable text fields
- **Image Support**: Add custom images via URL
- **Color Customization**: 
  - Primary color (main gradient)
  - Accent color (gradient accent)
  - Text color (all text elements)
- **Color Presets**: Quick color schemes to get started

### Card Preview
- Real-time preview while editing
- Animated gradient backgrounds
- Responsive design
- Dark mode support

### Database Integration
- All Blink cards are saved to MongoDB
- Automatic retrieval when viewing payment links
- Fast caching for performance

## How It Works

### Creating a Blink Card

1. Navigate to the Create Payment page
2. Toggle to "Blink" mode
3. Enter the payment amount
4. Customize your card:
   - Choose a card type (Tip, Donation, etc.)
   - Add a catchy title
   - Write a description
   - (Optional) Add an image URL
   - Customize colors or use presets
5. Click "Generate Blink"

The card data is automatically saved to MongoDB!

### Viewing a Blink Card

When someone visits a Blink payment link:
1. The app fetches the card data from MongoDB using the linkId
2. The beautiful custom card is displayed
3. Users can proceed to make the payment

### P-Link vs Blink

**P-Link (Private Payment Link)**:
- Designed for private, one-to-one payments
- Shared via messaging apps, email, etc.
- Uses zero-knowledge proofs for privacy
- Simple payment request display

**Blink (Blockchain Link)**:
- Designed for public sharing on social media
- Visually appealing cards for tips/donations
- Shareable on Twitter, Discord, etc.
- Custom branding and images

## API Routes

### Save Blink Card
- **Endpoint**: `POST /api/blink/save`
- **Body**:
```json
{
  "linkId": "abc123",
  "requestedAmount": "0.5",
  "cardTitle": "Support My Work",
  "cardDescription": "Your contribution helps!",
  "cardImageUrl": "https://example.com/image.jpg",
  "cardType": "tip",
  "primaryColor": "#7C3AED",
  "secondaryColor": "#14F195",
  "textColor": "#FFFFFF"
}
```

### Get Blink Card
- **Endpoint**: `GET /api/blink/:linkId`
- **Response**:
```json
{
  "success": true,
  "data": {
    "linkId": "abc123",
    "requestedAmount": "0.5",
    "cardTitle": "Support My Work",
    ...
  }
}
```

## Components

### BlinkCard
Reusable card component with animated gradients and customizable styling.

**Props**:
- `data`: Card data (title, description, colors, etc.)
- `className`: Optional additional CSS classes
- `animate`: Whether to enable entrance animations

## Database Schema

```typescript
{
  linkId: string (unique, indexed)
  requestedAmount: string
  cardTitle: string (max 100 chars)
  cardDescription: string (max 500 chars)
  cardImageUrl: string (optional)
  cardType: 'tip' | 'donation' | 'payment' | 'custom'
  primaryColor: string (hex color)
  secondaryColor: string (hex color)
  textColor: string (hex color)
  createdAt: Date
  updatedAt: Date
}
```

## Tips for Great Cards

1. **Use High-Quality Images**: Use direct image URLs (ending in .jpg, .png, etc.)
2. **Keep Titles Short**: 2-5 words work best
3. **Clear Descriptions**: Explain what the payment is for
4. **Contrast**: Ensure text color contrasts well with your chosen gradients
5. **Color Harmony**: Use the presets or complementary colors

## Troubleshooting

### "Failed to save blink card"
- Check your MongoDB connection string in `.env.local`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify database user permissions

### Card Not Displaying
- Check browser console for API errors
- Verify the linkId is correct
- Ensure MongoDB is accessible

### Images Not Loading
- Use direct image URLs (HTTPS recommended)
- Check image URL is publicly accessible
- Verify image format is supported (JPG, PNG, WebP, etc.)

## Future Enhancements

- [ ] Image upload to cloud storage (vs. URL input)
- [ ] More card templates and layouts
- [ ] GIF support for animated cards
- [ ] Social media preview optimization
- [ ] Analytics dashboard for Blink views/payments
- [ ] QR code generation for cards
- [ ] Card themes marketplace

## Example Use Cases

- **Content Creators**: Accept tips from followers
- **Nonprofits**: Create donation cards for campaigns
- **Freelancers**: Request payment for services
- **Events**: Sell tickets or accept donations
- **Communities**: Collect funds for projects

Enjoy creating beautiful Blink cards! 🎨✨
