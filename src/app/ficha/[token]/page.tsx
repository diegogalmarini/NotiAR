import { getFichaByToken } from "@/app/actions/fichas";
import { FichaForm } from "./FichaForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Props {
    params: Promise<{ token: string }>;
}

export default async function FichaPublicPage({ params }: Props) {
    const { token } = await params;
    const res = await getFichaByToken(token);

    if (!res.success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-md">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {res.error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <FichaForm tokenData={res.data} />
        </div>
    );
}
