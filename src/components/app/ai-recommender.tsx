'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { customerServiceRecommendation } from '@/ai/flows/customer-service-recommendation-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';

const recommendationSchema = z.object({
  carCondition: z.string().min(1, 'Please describe your car condition.'),
  userPreferences: z.string().min(1, 'Please list your preferences.'),
  preferredDateTime: z.string().min(1, 'Please enter your preferred time.'),
});

type RecommendationFormValues = z.infer<typeof recommendationSchema>;

type Recommendation = {
    suggestedServiceType: string;
    optimalBookingTimes: string[];
    reasoning: string;
}

export function AiRecommender() {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      carCondition: '',
      userPreferences: '',
      preferredDateTime: '',
    },
  });

  const onSubmit = async (values: RecommendationFormValues) => {
    setLoading(true);
    setRecommendation(null);
    setError(null);
    try {
      const result = await customerServiceRecommendation({
        carCondition: values.carCondition,
        userPreferences: values.userPreferences.split(',').map(p => p.trim()),
        preferredDateTime: values.preferredDateTime,
        currentLocation: 'user\'s current location', // Mocked
      });
      setRecommendation(result);
    } catch (e) {
      console.error(e);
      setError('Failed to get recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-6 w-6" />
          <span>Need Help Choosing?</span>
        </CardTitle>
        <CardDescription>
          Use our AI assistant to find the perfect service and time for your needs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="carCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="e.g., Lightly dusty, very muddy..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light dust">Light dust</SelectItem>
                      <SelectItem value="moderate dirt">Moderate dirt</SelectItem>
                      <SelectItem value="very dirty with mud">Very dirty with mud</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferences</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., interior cleaning, quick, wax" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="preferredDateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., This Saturday morning" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Get Recommendation
            </Button>
          </form>
        </Form>
      </CardContent>
      {recommendation && (
        <CardFooter className="flex-col items-start gap-2 bg-primary/10 p-4 rounded-b-lg">
            <h4 className="font-semibold text-primary">AI Suggestion: {recommendation.suggestedServiceType}</h4>
            <p className="text-sm"><span className="font-medium">Reasoning:</span> {recommendation.reasoning}</p>
            <p className="text-sm"><span className="font-medium">Suggested Times:</span> {recommendation.optimalBookingTimes.join(', ')}</p>
        </CardFooter>
      )}
       {error && (
        <CardFooter>
            <p className="text-sm text-destructive">{error}</p>
        </CardFooter>
      )}
    </Card>
  );
}
