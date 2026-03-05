import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Parent, Austin → Hyderabad",
      content: "EduSetu helped my child adapt seamlessly after we moved from Austin to Hyderabad. The learning pathway and Hindi modules were spot-on.",
      rating: 5,
      location: "Texas to Telangana"
    },
    {
      name: "Rajesh Patel",
      role: "Parent, San Jose → Mumbai",
      content: "Parent counseling made all the difference. This isn't just a tutoring service—it's a bridge for families like ours.",
      rating: 5,
      location: "California to Maharashtra"
    },
    {
      name: "Arjun Kumar",
      role: "Student, Grade 11",
      content: "I was worried about SAT prep while preparing for JEE. EduSetu's dual-prep approach helped me excel in both without compromise.",
      rating: 5,
      location: "Chicago to Bangalore"
    },
    {
      name: "Meera Reddy",
      role: "Parent, Seattle → Chennai",
      content: "The cultural modules and re-entry toolkit prepared our entire family. My daughter now speaks fluent Tamil and aced her board exams.",
      rating: 5,
      location: "Washington to Tamil Nadu"
    },
    {
      name: "Vikram Singh",
      role: "Student, Grade 10",
      content: "The 24/7 support made me feel connected to home while living in the US. Now I'm confident in both American and Indian education systems.",
      rating: 5,
      location: "New York to Delhi"
    },
    {
      name: "Anjali Gupta",
      role: "Parent, Boston → Pune",
      content: "EduSetu understands the unique challenges of migrant families. The gap analysis was incredibly detailed and actionable.",
      rating: 5,
      location: "Massachusetts to Maharashtra"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Stories from <span className="text-secondary">Families Like Yours</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Short, authentic parent and student testimonials about academic and cultural integration.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-medium border border-border bg-card hover:shadow-strong transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                
                <div className="relative mb-4">
                  <Quote className="h-6 w-6 text-secondary/30 absolute -top-2 -left-1" />
                  <p className="text-muted-foreground leading-relaxed pl-6">
                    {testimonial.content}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-secondary">{testimonial.role}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.location}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Stats */}
        <div className="mt-16 text-center">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">10,000+</div>
                <div className="text-sm text-muted-foreground">Families Served</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-secondary">95%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-secondary">24/7</div>
                <div className="text-sm text-muted-foreground">Family Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
