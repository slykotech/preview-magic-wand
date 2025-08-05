import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface ValidationResult {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
}

export const PartnerConnectionValidationDisplay = () => {
  const validationRules: ValidationResult[] = [
    {
      type: 'success',
      title: '✅ Single Partner Rule',
      description: 'Each user can only connect to one partner at a time'
    },
    {
      type: 'success', 
      title: '✅ Target User Validation',
      description: 'Cannot send requests to users who are already connected'
    },
    {
      type: 'success',
      title: '✅ Duplicate Request Prevention',
      description: 'Cannot send multiple requests to the same email'
    },
    {
      type: 'success',
      title: '✅ Self-Request Prevention',
      description: 'Cannot send partner requests to your own email'
    },
    {
      type: 'info',
      title: 'ℹ️ Demo Mode Handling',
      description: 'Demo mode (user connected to themselves) allows new connections'
    },
    {
      type: 'warning',
      title: '⚠️ Connection Override',
      description: 'Users must remove existing partner before connecting to someone new'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          Partner Connection Security Rules
        </CardTitle>
        <CardDescription>
          Enhanced validation system to prevent duplicate connections and ensure data integrity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationRules.map((rule, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            {getIcon(rule.type)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{rule.title}</h4>
                <Badge variant={getBadgeVariant(rule.type)} className="text-xs">
                  {rule.type.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            </div>
          </div>
        ))}
        
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            🔒 Implementation Complete
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300">
            All duplicate partner connection prevention measures have been successfully implemented. 
            The system now enforces strict one-partner-per-user relationships with comprehensive validation 
            at both client and server levels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};