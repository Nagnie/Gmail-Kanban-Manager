import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "../schemas/auth";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertCircleIcon, Eye, EyeOff, LockIcon, Mail, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { loginUser, googleLogin } from "@/store/authSlice";
import { useGoogleLogin } from "@react-oauth/google";

export default function SignIn() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { isLoading, error, accessToken } = useAppSelector((state) => state.auth);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (accessToken) {
            navigate('/dashboard', { replace: true });
        }
    }, [accessToken, navigate]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            // await thunk and throw error
            await dispatch(loginUser(data)).unwrap();
            
            navigate('/dashboard', { replace: true }); 
            
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                await dispatch(googleLogin(tokenResponse.access_token)).unwrap();

                navigate('/dashboard');
            } catch (error) {
                console.error('Google login failed:', error);
            }
        },
        onError: (error) => {
            console.error('Google OAuth error:', error);
        },
    });

    return (
        <div className={"min-w-screen min-h-screen flex items-center justify-center"}>
            <div className="w-110">
                <Card className="w-full px-4 py-8">
                    <CardHeader className={"text-start"}>
                        <CardTitle className={"font-bold text-2xl"}>
                            Sign in to your account
                        </CardTitle>
                        <CardDescription>Welcome back! Please sign in to continue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-start">
                            <div>
                                <div>
                                    <Label htmlFor="email" className={"font-bold text-base mb-2"}>
                                        Email
                                    </Label>
                                    <div className="relative mb-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Mail size={16} />
                                        </span>
                                        <Input
                                            id="name"
                                            type="text"
                                            {...register("email")}
                                            placeholder="Your email"
                                            className={`ps-9 ${
                                                errors.email ? "border-red-500" : ""
                                            }`}
                                            required
                                        />
                                    </div>
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center mb-2">
                                    <Label htmlFor="password" className={"font-bold text-base"}>
                                        Password
                                    </Label>
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <div className="relative mb-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <LockIcon size={16} />
                                    </span>
                                    {/* Input password */}
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={"••••••"}
                                        required
                                        {...register("password")}
                                        className={`ps-9 pe-9 ${
                                            errors.password ? "border-red-500" : ""
                                        }`}
                                    />

                                    {/* Icon hiện/ẩn password bên phải */}
                                    <span
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </span>

                                    {errors.password && (
                                        <p className="text-red-500 text-sm">
                                            {errors.password.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className={"text-red-500 flex items-center gap-2"}>
                                    <AlertCircleIcon className={"w-4 h-4"} />
                                    <p>{error}</p>
                                </div>
                            )}

                            <Button
                                variant={"default"}
                                type="submit"
                                className="w-full font-bold cursor-pointer"
                                disabled={isLoading}
                                data-testid="login-btn"
                            >
                                {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Sign in
                            </Button>
                            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                                <span className="bg-card text-muted-foreground relative z-10 px-2">
                                    Or continue with
                                </span>
                            </div>
                            <Button 
                                variant={"outline"} 
                                className="w-full cursor-pointer"
                                type="button"
                                onClick={() => handleGoogleLogin()}
                                disabled={isLoading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path
                                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                        fill="currentColor"
                                    />
                                </svg>
                                Google
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <p className="text-muted-foreground">
                            Don't have an account? {"  "}
                            <Link to="/signup" className="ms-1 text-foreground font-bold underline">
                                Sign up
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
