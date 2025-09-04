import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, GraduationCap, Shield } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface ProfileDialogProps {
  user: UserType;
}

export default function ProfileDialog({ user }: ProfileDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'student':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'student':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2"
          data-testid="button-profile"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>User Profile</span>
          </DialogTitle>
          <DialogDescription>
            View your account information and details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-slate-900">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`${getRoleColor(user.role)} flex items-center space-x-1`}>
                  {getRoleIcon(user.role)}
                  <span className="capitalize">{user.role}</span>
                </Badge>
                {user.studentId && (
                  <Badge variant="outline" className="text-slate-600">
                    ID: {user.studentId}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <User className="w-5 h-5 text-slate-500" />
                  <h3 className="font-medium text-slate-900">Personal Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Username</label>
                    <p className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded text-sm">
                      {user.username}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Full Name</label>
                    <p className="text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                  {user.studentId && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Student ID</label>
                      <p className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded text-sm">
                        {user.studentId}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <h3 className="font-medium text-slate-900">Contact Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email Address</label>
                    <p className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded text-sm break-all">
                      {user.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <h3 className="font-medium text-slate-900">Account Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Account Created</label>
                    <p className="text-slate-900">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Last Updated</label>
                    <p className="text-slate-900">
                      {formatDate(user.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
