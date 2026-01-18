"use client";

import { useState, useEffect } from "react";
import { Home, Search } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Asset {
    id: string;
    partido_id: string;
    nro_partida: string;
}

interface AssetSearchProps {
    onSelect: (assetId: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function AssetSearch({ onSelect, open, setOpen }: AssetSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/api/search/assets?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Vincular Inmueble</DialogTitle>
                </DialogHeader>
                <Command>
                    <CommandInput
                        placeholder="Partido o Nro Partida..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>}
                        <CommandEmpty>No se encontraron inmuebles.</CommandEmpty>
                        <CommandGroup>
                            {results.map((asset) => (
                                <CommandItem
                                    key={asset.id}
                                    value={`${asset.partido_id} ${asset.nro_partida}`}
                                    onSelect={() => {
                                        onSelect(asset.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    <div className="flex flex-col">
                                        <span>Partido: {asset.partido_id}</span>
                                        <span className="text-xs text-muted-foreground">Partida: {asset.nro_partida}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
