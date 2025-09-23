"use client";
import AuthGuard from "@/components/AuthGuard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function DeploymentsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DashboardHeader />
        <DeploymentsContent />
      </div>
    </AuthGuard>
  );
}

function DeploymentsContent() {
  const t = useTranslations('dashboard');

  const deployments = [
    {
      id: 1,
      name: "Clinical Trial Data v1.2",
      status: "Deployed",
      environment: "Production",
      url: "https://clinical-trial-v1-2.vercel.app",
      lastDeployed: "2 hours ago",
      deployedBy: "John Doe",
      commit: "a1b2c3d",
      branch: "main",
      duration: "3m 45s"
    },
    {
      id: 2,
      name: "Patient Records v2.0",
      status: "Building",
      environment: "Staging",
      url: "https://patient-records-v2-0.vercel.app",
      lastDeployed: "Building...",
      deployedBy: "Jane Smith",
      commit: "e4f5g6h",
      branch: "feature/privacy-updates",
      duration: "2m 30s"
    },
    {
      id: 3,
      name: "Drug Efficacy Study v1.0",
      status: "Failed",
      environment: "Production",
      url: "https://drug-efficacy-v1-0.vercel.app",
      lastDeployed: "1 day ago",
      deployedBy: "Mike Johnson",
      commit: "i7j8k9l",
      branch: "main",
      duration: "Failed"
    },
    {
      id: 4,
      name: "Research Dataset v0.9",
      status: "Ready",
      environment: "Preview",
      url: "https://research-dataset-v0-9.vercel.app",
      lastDeployed: "Ready to deploy",
      deployedBy: "Sarah Wilson",
      commit: "m1n2o3p",
      branch: "develop",
      duration: "Pending"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Deployed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Building":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "Failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Ready":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Deployed":
        return "bg-green-100 text-green-800";
      case "Building":
        return "bg-blue-100 text-blue-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      case "Ready":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Deployments</h1>
            <p className="text-gray-600">Manage your synthetic data deployments and environments.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Redeploy All
            </Button>
            <Button className="bg-[#E0342C] hover:bg-[#E0342C]/90 text-white">
              <Play className="h-4 w-4 mr-2" />
              New Deployment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg font-bold">G</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-black text-lg">{deployment.name}</h3>
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                        <Badge variant="outline">
                          {deployment.environment}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">URL:</span>{" "}
                          <a 
                            href={deployment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#E0342C] hover:underline"
                          >
                            {deployment.url}
                            <ExternalLink className="h-3 w-3 inline ml-1" />
                          </a>
                        </div>
                        <div>
                          <span className="font-medium">Last Deployed:</span> {deployment.lastDeployed}
                        </div>
                        <div>
                          <span className="font-medium">Deployed By:</span> {deployment.deployedBy}
                        </div>
                        <div>
                          <span className="font-medium">Commit:</span> {deployment.commit}
                        </div>
                        <div>
                          <span className="font-medium">Branch:</span> {deployment.branch}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {deployment.duration}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(deployment.status)}
                      <span className="text-sm text-gray-600">{deployment.status}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={deployment.status === "Building"}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Deploy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={deployment.status === "Building"}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    disabled={deployment.status === "Building"}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Redeploy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    asChild
                  >
                    <a 
                      href={deployment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
