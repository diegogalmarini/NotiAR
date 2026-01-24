import { formatNotaryMoney, formatNotaryDate, formatNotaryName } from "../../utils/formatters";

export interface DraftingContext {
    numero_escritura: string;
    acto_titulo: string;
    fecha: string; // YYYY-MM-DD
    escribano: string;
    registro: string;
    clientes: any[];
    inmuebles: any[];
    tax_calculation: any;
    compliance: any;
}

/**
 * DeedDrafter: Generates the legal text of a deed using dynamic composition.
 * Following logic from notary-deed-drafter skill.
 */
export class DeedDrafter {
    static generate(context: DraftingContext): string {
        const {
            numero_escritura,
            acto_titulo,
            fecha,
            escribano,
            registro,
            clientes,
            inmuebles,
            tax_calculation,
            compliance
        } = context;

        const dateTxt = formatNotaryDate(fecha);
        const vendors = clientes.filter(c => c.rol?.includes('VENDEDOR'));
        const buyers = clientes.filter(c => c.rol?.includes('COMPRADOR'));

        let text = `ESCRITURA NUMERO ${numero_escritura.toUpperCase()}.- ${acto_titulo.toUpperCase()}.- `;
        text += `En la ciudad de Bahía Blanca, provincia de Buenos Aires, a los ${dateTxt}, `;
        text += `ante mí, ${escribano.toUpperCase()}, Notario Titular del Registro ${registro.toUpperCase()}, COMPARECEN: `;

        // Comparecencia
        clientes.forEach((c, i) => {
            const formattedName = formatNotaryName(c.nombre_completo);
            text += `por una parte ${formattedName}, ${c.nacionalidad || 'argentino'}, DNI ${c.dni}${i === clientes.length - 1 ? '.' : '; '}`;
        });

        text += `\n\nINTERVENCION: Los comparecientes intervienen por su propio derecho. Y el vendedor DICE: Que VENDE, CEDE y TRANSFIERE a favor de la parte compradora, el siguiente Inmueble: `;

        // Inmueble
        inmuebles.forEach(i => {
            text += `\n${i.transcripcion_literal || '[FALTA DESCRIPCION TECNICA]'}`;
        });

        // Precio
        const moneyTxt = formatNotaryMoney(tax_calculation?.baseCalculoArs || 0, 'ARS');
        text += `\n\nPRECIO: La presente operación se realiza por el precio total de ${moneyTxt}, que la parte vendedora manifiesta haber recibido con anterioridad a este acto.`;

        // Compliance & PEPs
        if (compliance?.risk_level === 'HIGH' || compliance?.alerts?.length > 0) {
            text += `\n\nCONSTANCIAS UIF: `;
            compliance.alerts.forEach((alert: string) => {
                text += `\n- ${alert}`;
            });

            if (compliance.alerts.some((a: string) => a.includes('PEP'))) {
                text += `\nManifestando el comprador bajo fe de juramento su condición de Persona Expuesta Políticamente (PEP).`;
            }
        }

        // Taxes
        text += `\n\nIMPUESTOS Y TASAS: Se hace constar que se retienen las siguientes sumas: `;
        text += `Impuesto de Sellos: ${formatNotaryMoney(tax_calculation?.detail?.sellosPba || 0, 'ARS')}; `;
        text += `ITI: ${formatNotaryMoney(tax_calculation?.detail?.itiAfip || 0, 'ARS')}. `;

        text += `\n\nCIERRE: Leo a los comparecientes, quienes se ratifican en su contenido y firman ante mí, de lo que doy fe.`;

        return text;
    }
}
