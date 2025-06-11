/**
 * Checks if a story is 100% complete (all criteria checked)
 * @param {Object} story - The story to check
 * @returns {boolean} - True if all criteria are checked, false otherwise
 */
export const isStoryComplete = (story) => {
  if (!story.criteria || story.criteria.length === 0) {
    return false; // If no criteria, consider it not complete
  }
  return story.criteria.every(criterion => criterion.checked);
};

/**
 * Sorts stories with completed stories at the end
 * @param {Array} stories - Array of stories to sort
 * @returns {Array} - Sorted array of stories
 */
export const sortStoriesWithCompletedLast = (stories) => {
  return [...stories].sort((a, b) => {
    const aComplete = isStoryComplete(a);
    const bComplete = isStoryComplete(b);
    
    // If both are complete or both are incomplete, maintain original order
    if (aComplete === bComplete) return 0;
    
    // Incomplete stories come first, complete stories come last
    return aComplete ? 1 : -1;
  });
};
