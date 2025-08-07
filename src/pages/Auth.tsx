
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail, Lock, User, Eye, EyeOff, Building, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Department {
  id: string;
  name: string;
  description: string;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
    fetchDepartments();
  }, [navigate]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    setDepartmentError("");
    
    try {
      console.log('Fetching departments...');
      
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');
      
      if (error) {
        console.error('Error fetching departments:', error);
        setDepartmentError("Failed to load departments. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load departments. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }

      console.log('Departments fetched successfully:', data);
      setDepartments(data || []);
      
    } catch (error) {
      console.error('Unexpected error fetching departments:', error);
      setDepartmentError("An unexpected error occurred while loading departments.");
      toast({
        title: "Error",
        description: "Failed to load departments. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoadingDepartments(false);
    }
  };


  const validateForm = () => {
    if (!email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!password.trim()) {
      toast({
        title: "Validation Error",
        description: "Password is required.",
        variant: "destructive"
      });
      return false;
    }

    if (!isLogin) {
      if (!firstName.trim()) {
        toast({
          title: "Validation Error",
          description: "First name is required.",
          variant: "destructive"
        });
        return false;
      }

      if (!lastName.trim()) {
        toast({
          title: "Validation Error",
          description: "Last name is required.",
          variant: "destructive"
        });
        return false;
      }

      if (!selectedDepartment) {
        toast({
          title: "Validation Error",
          description: "Please select a department.",
          variant: "destructive"
        });
        return false;
      }

      if (password.length < 6) {
        toast({
          title: "Validation Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive"
        });
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          let errorMessage = "An error occurred during login.";
          
          if (error.message.includes("Invalid login credentials")) {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
          } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Please check your email and confirm your account before logging in.";
          } else if (error.message.includes("Too many requests")) {
            errorMessage = "Too many login attempts. Please wait a moment before trying again.";
          }

          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been successfully logged in.",
          });
          navigate("/");
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              department_id: selectedDepartment
            }
          }
        });

        if (error) {
          let errorMessage = "An error occurred during signup.";
          
          if (error.message.includes("User already registered")) {
            errorMessage = "An account with this email already exists. Please try logging in instead.";
          } else if (error.message.includes("Password should be at least")) {
            errorMessage = "Password must be at least 6 characters long.";
          } else if (error.message.includes("Unable to validate email address")) {
            errorMessage = "Please enter a valid email address.";
          }

          toast({
            title: "Signup Failed",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account before logging in.",
          });
          setIsLogin(true);
          setEmail("");
          setPassword("");
          setFirstName("");
          setLastName("");
          setSelectedDepartment("");
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setSelectedDepartment("");
  };

  const handleRetryDepartments = () => {
    setDepartmentError("");
    fetchDepartments();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center">
              <img 
                src="/lovable-uploads/ee362ced-371f-4ebd-a238-94b33ae86a02.png" 
                alt="Province of Ilocos Sur Logo" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">One Ilocos Sur Portal</CardTitle>
          <CardDescription>
            {isLogin ? "Welcome back! Please sign in to your account." : "Create your account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        required={!isLogin}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="department">Department *</Label>
                    {departmentError && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRetryDepartments}
                        className="h-6 px-2 text-xs"
                        disabled={loadingDepartments}
                      >
                        {loadingDepartments ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Retry
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-3 text-gray-400 z-10" />
                    <Select 
                      value={selectedDepartment} 
                      onValueChange={setSelectedDepartment} 
                      disabled={loading || loadingDepartments || departmentError !== ""}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder={
                          departmentError 
                            ? "Failed to load departments" 
                            : loadingDepartments 
                              ? "Loading departments..." 
                              : departments.length === 0 
                                ? "No departments available" 
                                : "Select your department"
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-60 overflow-y-auto z-50">
                        {loadingDepartments ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading departments...</span>
                            </div>
                          </SelectItem>
                        ) : departmentError ? (
                          <SelectItem value="error" disabled>
                            <div className="flex flex-col">
                              <span className="text-red-600 font-medium">Error loading departments</span>
                              <span className="text-xs text-red-500">{departmentError}</span>
                            </div>
                          </SelectItem>
                        ) : departments.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            <div className="flex flex-col">
                              <span className="text-gray-600">No departments available</span>
                              <span className="text-xs text-gray-500">Please contact administrator</span>
                            </div>
                          </SelectItem>
                        ) : (
                          departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id} className="cursor-pointer hover:bg-gray-50">
                              <div className="flex flex-col py-1">
                                <span className="font-medium">{dept.name}</span>
                                {dept.description && (
                                  <span className="text-xs text-gray-500">{dept.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {departmentError && (
                    <p className="text-xs text-red-500 mt-1">
                      {departmentError}
                    </p>
                  )}
                  {loadingDepartments && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center space-x-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading departments...</span>
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@ilocossur.gov.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-gray-600">
                  Password should be at least 6 characters long
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (!isLogin && (loadingDepartments || departmentError !== ""))}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {isLogin 
                ? "Don't have an account? Sign up here" 
                : "Already have an account? Sign in here"
              }
            </button>
          </div>

          {!isLogin && (loadingDepartments || departmentError) && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                {loadingDepartments ? "Loading departments..." : "Department selection is required for signup"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
