'use server';
/**
 * @fileOverview A Genkit flow for business owners to generate engaging car wash service descriptions.
 *
 * - generateServiceDescription - A function that handles the service description generation process.
 * - BusinessOwnerServiceDescriptionGeneratorInput - The input type for the generateServiceDescription function.
 * - BusinessOwnerServiceDescriptionGeneratorOutput - The return type for the generateServiceDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BusinessOwnerServiceDescriptionGeneratorInputSchema = z.object({
  serviceName: z.string().describe('The name of the car wash service.'),
  features: z.array(z.string()).describe('A list of key features for the service.').optional(),
  price: z.string().describe('The price or pricing range for the service (e.g., "$25", "Starts at $30").'),
  targetAudience: z.string().describe('The target audience for this service (e.g., "daily commuters", "luxury car owners").').optional(),
});
export type BusinessOwnerServiceDescriptionGeneratorInput = z.infer<typeof BusinessOwnerServiceDescriptionGeneratorInputSchema>;

const BusinessOwnerServiceDescriptionGeneratorOutputSchema = z.object({
  generatedDescription: z.string().describe('An engaging and informative description for the car wash service.'),
});
export type BusinessOwnerServiceDescriptionGeneratorOutput = z.infer<typeof BusinessOwnerServiceDescriptionGeneratorOutputSchema>;

export async function generateServiceDescription(input: BusinessOwnerServiceDescriptionGeneratorInput): Promise<BusinessOwnerServiceDescriptionGeneratorOutput> {
  return businessOwnerServiceDescriptionGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'businessOwnerServiceDescriptionPrompt',
  input: {schema: BusinessOwnerServiceDescriptionGeneratorInputSchema},
  output: {schema: BusinessOwnerServiceDescriptionGeneratorOutputSchema},
  prompt: `You are an expert copywriter specializing in creating engaging and informative descriptions for car wash services.

Your task is to generate a compelling service description based on the provided details. The description should highlight the service's benefits, features, and target audience, encouraging customers to book.

--- Input Details ---
Service Name: {{{serviceName}}}
Price: {{{price}}}
{{#if features}}Features: {{#each features}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Features: No specific features provided, make up some common ones for the service name.{{/if}}
{{#if targetAudience}}Target Audience: {{{targetAudience}}}{{else}}Target Audience: General audience.{{/if}}


Generate an engaging and informative description for this car wash service, approximately 2-4 sentences long. Make it sound appealing and professional.`,
});

const businessOwnerServiceDescriptionGeneratorFlow = ai.defineFlow(
  {
    name: 'businessOwnerServiceDescriptionGeneratorFlow',
    inputSchema: BusinessOwnerServiceDescriptionGeneratorInputSchema,
    outputSchema: BusinessOwnerServiceDescriptionGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
