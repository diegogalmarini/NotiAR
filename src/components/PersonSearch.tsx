"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface Person {
    tax_id: string;
    nombre_completo: string;
}

interface PersonSearchProps {
    onSelect: (personId: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export function PersonSearch({ onSelect, open, setOpen }: PersonSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/api/search/people?q=${encodeURIComponent(query)}`);
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
                    <DialogTitle>Buscar Persona</DialogTitle>
                </DialogHeader>
                <Command>
                    <CommandInput
                        placeholder="Nombre o DNI..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>}
                        <CommandEmpty>No se encontraron personas.</CommandEmpty>
                        <CommandGroup>
                            {results.map((person) => (
                                <CommandItem
                                    key={person.tax_id}
                                    value={person.nombre_completo}
                                    onSelect={() => {
                                        onSelect(person.tax_id);
                                        setOpen(false);
                                    }}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    <div className="flex flex-col">
                                        <span>{person.nombre_completo}</span>
                                        <span className="text-xs text-muted-foreground">{person.tax_id}</span>
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
