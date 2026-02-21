'use server';
/**
 * @fileOverview An AI assistant that suggests optimal car wash services and booking times.
 *
 * - customerServiceRecommendation - A function that handles the car wash service recommendation process.
 * - CustomerServiceRecommendationInput - The input type for the customerServiceRecommendation function.
 * - CustomerServiceRecommendationOutput - The return type for the customerServiceRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomerServiceRecommendationInputSchema = z.object({
  carCondition: z
    .string()
    .describe(
      'The current condition of the car, e.g., "light dust", "moderate dirt", "very dirty with mud".'
    ),
  userPreferences: z
    .array(z.string())
    .describe(
      'A list of user preferences for the car wash service, e.g., "eco-friendly", "interior cleaning", "quick service", "tire shine", "wax".'
    ),
  preferredDateTime: z
    .string()
    .describe(
      'The preferred date and time for the car wash, e.g., "next Saturday morning", "today afternoon".'
    ),
  currentLocation: z
    .string()
    .describe(
      'The user\'s current location or preferred service area, e.g., "downtown area", "near my home".'
    ),
});
export type CustomerServiceRecommendationInput = z.infer<
  typeof CustomerServiceRecommendationInputSchema
>;

const CustomerServiceRecommendationOutputSchema = z.object({
  suggestedServiceType: z
    .string()
    .describe(
      'The recommended car wash service type, e.g., "Express Exterior", "Deluxe Wash", "Premium Detail", "Eco Wash".'
    ),
  optimalBookingTimes: z
    .array(z.string())
    .describe(
      'A list of optimal booking times for the suggested service, e.g., "Today at 2:00 PM", "Tomorrow at 10:30 AM".'
    ),
  reasoning: z
    .string()
    .describe(
      'A brief explanation of why this service and times are recommended based on the input.'
    ),
});
export type CustomerServiceRecommendationOutput = z.infer<
  typeof CustomerServiceRecommendationOutputSchema
>;

export async function customerServiceRecommendation(
  input: CustomerServiceRecommendationInput
): Promise<CustomerServiceRecommendationOutput> {
  return customerServiceRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customerServiceRecommendationPrompt',
  input: {schema: CustomerServiceRecommendationInputSchema},
  output: {schema: CustomerServiceRecommendationOutputSchema},
  prompt: `You are an intelligent car wash service recommender for HydroFlow Pro, a car wash marketplace.
Your task is to suggest the most suitable car wash service type and optimal booking times based on the user's car condition, preferences, preferred date/time, and location.

Available Car Wash Services:
- Express Exterior: Quick wash, basic exterior clean. Ideal for light dust.
- Deluxe Wash: Exterior wash, undercarriage clean. Good for moderate dirt.
- Premium Detail: Full exterior wash, interior vacuum, tire shine, wax. Best for very dirty cars or those needing extra care.
- Eco Wash: Environmentally friendly, low-water or waterless wash. Good for those prioritizing sustainability.

General Availability:
Services are generally available on weekdays and weekends from 9 AM to 6 PM. Specific slots depend on current demand, but you should suggest plausible times.

User Input:
Car Condition: {{{carCondition}}}
User Preferences: {{{userPreferences}}}
Preferred Date/Time: {{{preferredDateTime}}}
Current Location: {{{currentLocation}}}

Based on the above information, recommend ONE service type and provide at least two optimal booking times. Also, provide a brief reasoning for your suggestion.`,
});

const customerServiceRecommendationFlow = ai.defineFlow(
  {
    name: 'customerServiceRecommendationFlow',
    inputSchema: CustomerServiceRecommendationInputSchema,
    outputSchema: CustomerServiceRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
