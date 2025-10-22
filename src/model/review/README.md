# Review Model

This directory contains the modular organization of the Review model for the e-commerce platform.

## Structure

```
review/
├── index.ts                    # Main model assembly and exports
├── schemas/
│   └── review.schema.ts        # Mongoose schema definition
├── methods/
│   ├── instance.methods.ts     # Instance methods for review documents
│   └── static.methods.ts       # Static methods for the Review model
├── middleware/
│   └── validation.middleware.ts # Pre/post save validation and hooks
├── utils/
│   ├── analytics.utils.ts      # Review analytics and insights
│   ├── moderation.utils.ts     # Auto-moderation and spam detection
│   └── validation.utils.ts     # Data validation utilities
└── README.md                   # This file
```

## Features

### Core Review Functionality
- **User Reviews**: Users can write reviews with ratings (1-5 stars)
- **Rich Content**: Support for titles, comments, and up to 5 images per review
- **Verified Purchases**: Track which reviews are from verified purchasers
- **Recommendations**: Users can recommend products
- **Helpful Votes**: Community voting on review helpfulness
- **Reporting System**: Users can report inappropriate reviews
- **Moderation**: Admin moderation with auto-moderation capabilities

### Analytics & Insights
- **Sentiment Analysis**: Calculate sentiment scores from ratings and text
- **Quality Scoring**: Assess review quality based on length, detail, and verification
- **Fake Review Detection**: Automated detection of potentially fake reviews
- **Review Insights**: Generate comprehensive analytics for products
- **Keyword Extraction**: Identify common themes and keywords in reviews
- **Trend Analysis**: Track review trends over time

### Moderation Features
- **Auto-Moderation**: Automatically hide/flag reviews based on reports and analysis
- **Spam Detection**: Identify promotional content and spam
- **Content Filtering**: Detect inappropriate content and policy violations
- **Bulk Actions**: Perform moderation actions on multiple reviews
- **Moderation Queue**: Prioritized queue for manual review
- **False Positive Recovery**: Restore incorrectly moderated reviews

## Usage Examples

### Basic Operations

```typescript
import Review from '../review';

// Create a new review
const review = new Review({
  user: userId,
  product: productId,
  rating: 5,
  title: "Great product!",
  comment: "This product exceeded my expectations. Highly recommended!",
  isVerifiedPurchase: true,
  isRecommended: true
});
await review.save();

// Get reviews for a product
const reviews = await Review.findByProduct(productId);

// Get verified reviews only
const verifiedReviews = await Review.findVerifiedReviews(productId);

// Get review statistics
const stats = await Review.getAverageRating(productId);
const distribution = await Review.getRatingDistribution(productId);
```

### Interaction Features

```typescript
// Vote review as helpful
await review.voteHelpful(userId);

// Report a review
await review.reportReview(userId, "Inappropriate content");

// Moderate a review (admin action)
await review.moderate(moderatorId, false, "Violates community guidelines");
```

### Analytics

```typescript
import { 
  generateReviewInsights, 
  calculateSentimentScore,
  detectFakeReview 
} from '../review';

// Generate comprehensive insights
const insights = generateReviewInsights(reviews);

// Calculate sentiment for a review
const sentiment = calculateSentimentScore(review.rating, review.comment);

// Check if review might be fake
const fakeScore = detectFakeReview(review, userHistory);
```

### Moderation

```typescript
import { 
  autoModerateReview, 
  generateModerationQueue,
  BulkModerationActions 
} from '../review';

// Auto-moderate a review
const moderationResult = await autoModerateReview(review, userHistory);

// Generate moderation queue
const queue = generateModerationQueue(reviewsNeedingModeration);

// Bulk moderation actions
const results = await BulkModerationActions.autoModerateBatch(reviews);
```

## Schema Features

### Indexes
- Optimized indexes for common queries (product, user, rating, etc.)
- Compound indexes for efficient filtering
- Text index for search functionality

### Validation
- Comprehensive validation rules for all fields
- Business rule enforcement (no duplicate reviews per user/product)
- Auto-moderation based on report thresholds

### Virtual Properties
- `helpfulPercentage`: Calculated helpful vote percentage
- `isReported`: Boolean indicating if review has been reported
- `needsModeration`: Boolean indicating if manual moderation is needed

## Advanced Features

### Auto-Moderation Rules
- Hide reviews with 5+ reports
- Flag reviews with 3+ reports for manual review
- Detect and flag potential fake reviews (70+ fake score)
- Identify spam and promotional content
- Filter inappropriate content

### Quality Assessment
- Comment length and detail scoring
- Verification status bonus
- Image inclusion bonus
- Helpful vote consideration
- Report penalty system

### Analytics Insights
- Average rating and sentiment tracking
- Review quality trends
- Common keyword identification
- Verification rate analysis
- Recommendation rate tracking
- Time-based trend analysis

## API Integration

The review model integrates seamlessly with the existing e-commerce API structure:

1. **Product Integration**: Automatically updates product review statistics
2. **User Integration**: Tracks user review history and behavior
3. **Admin Dashboard**: Provides moderation tools and analytics
4. **Search Integration**: Enables review search and filtering
5. **Notification System**: Triggers notifications for moderation needs

## Performance Considerations

- Efficient indexing strategy for fast queries
- Aggregation pipelines for statistical calculations
- Pagination support for large review sets
- Background processing for analytics updates
- Caching strategies for frequently accessed data

## Security Features

- Input sanitization for all text fields
- XSS protection in comment processing
- Rate limiting considerations for review creation
- Report abuse prevention
- Moderation audit trails