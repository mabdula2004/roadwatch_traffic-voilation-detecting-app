export const media = {
  viewfinder: "/f2e6b344-fdf7-407b-98c8-5adf7c6c0ece.jpg",

  evidence: "/c318b4f3-38ad-4646-8f82-93e7958981c1.jpg",

  communityclip: "/6a618aad-68bd-4feb-8dee-b591ce0d3722.jpg",

  commandframe: "/863a8899-a238-4abc-ba15-8409e5ba1b89.jpg"

} as const;

export type MediaKey = keyof typeof media;