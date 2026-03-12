'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getRecoverySessionFromHash() {
    const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
    const params = new URLSearchParams(hash);

    return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        type: params.get('type'),
    };
}

export default function ResetPasswordPage() {
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const getSupabase = () => {
        if (!supabaseRef.current) {
            supabaseRef.current = createClient();
        }
        return supabaseRef.current;
    };

    useEffect(() => {
        let cancelled = false;

        async function bootstrapRecovery() {
            try {
                setError('');
                const supabase = getSupabase();
                const currentUrl = new URL(window.location.href);
                const code = currentUrl.searchParams.get('code');

                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        throw exchangeError;
                    }
                    if (!cancelled) {
                        setReady(true);
                        window.history.replaceState({}, document.title, '/reset-password');
                    }
                    return;
                }

                const recovery = getRecoverySessionFromHash();
                if (
                    recovery.accessToken &&
                    recovery.refreshToken &&
                    recovery.type === 'recovery'
                ) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                        access_token: recovery.accessToken,
                        refresh_token: recovery.refreshToken,
                    });
                    if (setSessionError) {
                        throw setSessionError;
                    }

                    if (!cancelled) {
                        setReady(true);
                        window.history.replaceState({}, document.title, '/reset-password');
                    }
                    return;
                }

                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) {
                    throw sessionError;
                }

                if (!cancelled) {
                    setReady(Boolean(data.session));
                    if (!data.session) {
                        setError('Recovery link is invalid or expired. Request a new one.');
                    }
                }
            } catch {
                if (!cancelled) {
                    setReady(false);
                    setError('Recovery link is invalid or expired. Request a new one.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void bootstrapRecovery();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const supabase = getSupabase();
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });
            if (updateError) {
                throw updateError;
            }

            await supabase.auth.signOut();
            setMessage('Password updated successfully. You can sign in now.');
            setPassword('');
            setConfirmPassword('');
            setReady(false);
        } catch {
            setError('Failed to update password. Please request a new recovery link.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying recovery link...
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
                    <CardDescription>Set a new password for your admin account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 text-sm text-center">
                            {message}
                        </div>
                    )}

                    {ready ? (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="At least 8 characters"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="Repeat your password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating password...
                                    </>
                                ) : (
                                    'Update password'
                                )}
                            </Button>
                        </form>
                    ) : (
                        <Button asChild className="w-full">
                            <Link href="/admin/login">Back to admin login</Link>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
