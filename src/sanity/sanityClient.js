


// src/sanity/sanityClient.js
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url'; // --- (1) Image builder import

export const client = createClient({
  projectId: 'p0umau0m',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: 'sk4DICWK1IIBaMjwc7NIT74a6beHpq9A09C9LhGQ8VH8NSwKO3Sf8uUJxgX7VFhwQGrNmhoPPLDWWChdK2ORAHHK7Ftqxq4VYNvo23lYb7pWjCYJhuqyUTfAe2Z48ZMmgCRzyZ7OkXzJaNbNWW9Z4Gw0Z3yQlVJwrDzLQAYuqzLETjV3GCd7',
});


const builder = imageUrlBuilder(client);

export function urlFor(source) {
  return builder.image(source);
}