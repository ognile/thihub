'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push('/admin');
            } else {
                const data = await res.json();
                setError(data.error || 'Invalid credentials');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        setError('');
        setMessage('');

        if (!email) {
            setError('Enter your email first to receive a reset link.');
            return;
        }

        setResetLoading(true);
        try {
            const supabase = createClient();
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });

            if (resetError) {
                setError(resetError.message);
                return;
            }

            setMessage('Password reset link sent. Check your inbox and spam folder.');
        } catch {
            setError('Failed to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-2">
                        <span className="text-primary-foreground font-bold text-xl">T</span>
                    </div>
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the admin panel
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {message && (
                        <Alert className="mb-4">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={handlePasswordReset}
                            disabled={loading || resetLoading}
                        >
                            {resetLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending reset link...
                                </>
                            ) : (
                                'Forgot password? Send reset link'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
