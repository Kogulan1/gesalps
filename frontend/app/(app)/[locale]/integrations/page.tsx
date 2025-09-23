"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Github, 
  Zap, 
  Shield, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  Settings
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function IntegrationsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <IntegrationsContent />
      </div>
    </AuthGuard>
  );
}

function IntegrationsContent() {
  const t = useTranslations('dashboard');

  const integrations = [
    {
      id: 1,
      name: "Supabase",
      description: "Database and authentication services",
      status: "Connected",
      icon: <Database className="h-6 w-6" />,
      lastSync: "2 minutes ago",
      category: "Database"
    },
    {
      id: 2,
      name: "GitHub",
      description: "Version control and code management",
      status: "Connected",
      icon: <Github className="h-6 w-6" />,
      lastSync: "1 hour ago",
      category: "Development"
    },
    {
      id: 3,
      name: "Privacy Engine",
      description: "Differential privacy and audit services",
      status: "Connected",
      icon: <Shield className="h-6 w-6" />,
      lastSync: "5 minutes ago",
      category: "Privacy"
    },
    {
      id: 4,
      name: "Synthesis API",
      description: "Core synthetic data generation",
      status: "Disconnected",
      icon: <Zap className="h-6 w-6" />,
      lastSync: "Never",
      category: "Core"
    }
  ];

  const availableIntegrations = [
    {
      name: "AWS S3",
      description: "Cloud storage for datasets",
      category: "Storage"
    },
    {
      name: "Google Cloud",
      description: "Cloud computing and ML services",
      category: "Cloud"
    },
    {
      name: "Slack",
      description: "Team notifications and alerts",
      category: "Communication"
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Integrations</h1>
          <p className="text-gray-600">Manage your connected services and data sources.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Connected Integrations */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connected Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-gray-600">
                          {integration.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-black">{integration.name}</h3>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {integration.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Last sync: {integration.lastSync}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {integration.status === "Connected" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`text-sm ${
                            integration.status === "Connected" ? "text-green-600" : "text-red-600"
                          }`}>
                            {integration.status}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Integrations */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableIntegrations.map((integration, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-black">{integration.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{integration.description}</p>
                          <Badge variant="outline" className="text-xs">
                            {integration.category}
                          </Badge>
                        </div>
                        <Button size="sm" className="bg-[#E0342C] hover:bg-[#E0342C]/90 text-white">
                          Connect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
