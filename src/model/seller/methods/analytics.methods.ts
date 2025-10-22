/**
 * Instance method to update seller rating
 */
export async function updateRating(this: any, newRating: number): Promise<any> {
  if (newRating < 1 || newRating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  this.ratings.ratingBreakdown[
    newRating as keyof typeof this.ratings.ratingBreakdown
  ]++;
  this.ratings.totalRatings++;

  // Recalculate average rating
  const totalPoints =
    this.ratings.ratingBreakdown[5] * 5 +
    this.ratings.ratingBreakdown[4] * 4 +
    this.ratings.ratingBreakdown[3] * 3 +
    this.ratings.ratingBreakdown[2] * 2 +
    this.ratings.ratingBreakdown[1] * 1;

  this.ratings.averageRating = totalPoints / this.ratings.totalRatings;

  return this.save();
}
