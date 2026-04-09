import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Priya Mehta",
      role: "Relocated from San Jose, CA → Bengaluru",
      tag: "US → CBSE · Grade 7",
      content:
        "We were terrified Aarav would fall behind after six years in California. Globiculum showed us exactly what he needed to learn — and he walked into Class 7 in Bangalore knowing more than we hoped. The gap report was worth everything.",
      rating: 5,
    },
    {
      name: "Rajesh Iyer",
      role: "Relocated from London, UK → Chennai",
      tag: "UK → ICSE · Grade 9",
      content:
        "After 8 years in London, my daughter Ananya was anxious about joining ICSE. The Globiculum plan was so specific — right down to which chapters of which textbooks to cover first. She finished top of her class by the end of term.",
      rating: 5,
    },
    {
      name: "Sunita Reddy",
      role: "Relocated from Dubai, UAE → Hyderabad",
      tag: "IB → CBSE · Grade 8",
      content:
        "I was prepared to spend lakhs on private tutors and coaching centres. Globiculum gave us a smarter path for a fraction of the cost. Rohan bridged the Math and Science gaps in just 6 weeks. I wish we'd found this tool years ago.",
      rating: 5,
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-secondary font-semibold text-sm uppercase tracking-wider mb-3">
            Parent Stories
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 text-foreground leading-tight">
            Real families. Real transitions. Real relief.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="shadow-soft border border-border bg-card hover:shadow-medium transition-all"
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>

                <div className="relative mb-6">
                  <Quote className="h-6 w-6 text-secondary/20 absolute -top-2 -left-1" />
                  <p className="text-muted-foreground leading-relaxed pl-6">
                    {testimonial.content}
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-1">
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-secondary font-medium">{testimonial.tag}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
