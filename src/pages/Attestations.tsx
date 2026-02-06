import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttestations } from '@/hooks/useAttestations';
import { useCompany } from '@/hooks/useCompany';
import { FileText, Loader2, UserPlus, Calendar, MapPin, Building } from 'lucide-react';
import { toast } from 'sonner';

export default function Attestations() {
    const { employees, isLoading: loadingEmployees } = useEmployees();
    const { company } = useCompany();
    const { generateWorkCertificate, generateInternshipCertificate, isGenerating } = useAttestations();

    const [formData, setFormData] = useState({
        employeeId: '',
        type: 'TRAVAIL' as 'TRAVAIL' | 'STAGE',
        isCurrent: true,
        dateDebut: '',
        dateFin: '',
        issuanceDate: new Date().toISOString().split('T')[0],
        ville: '',
        departement: '',
        civilite: 'Monsieur',
    });

    const selectedEmployee = employees.find(e => e.id === formData.employeeId);
    const employeeHireDate = selectedEmployee?.date_embauche ? new Date(selectedEmployee.date_embauche).toLocaleDateString('fr-FR') : '...';

    const handleGenerate = async () => {
        if (!formData.employeeId) {
            toast.error('Veuillez sélectionner un employé');
            return;
        }

        if (formData.type === 'TRAVAIL') {
            await generateWorkCertificate({
                employeeId: formData.employeeId,
                isCurrent: formData.isCurrent,
                issuanceDate: formData.issuanceDate,
                ville: formData.ville,
                departement: formData.departement,
                dateFin: formData.isCurrent ? undefined : formData.dateFin,
                civilite: formData.civilite,
            });
        } else {
            if (!formData.dateDebut || !formData.dateFin) {
                toast.error('Veuillez renseigner les dates de début et de fin du stage');
                return;
            }
            await generateInternshipCertificate({
                employeeId: formData.employeeId,
                dateDebut: formData.dateDebut,
                dateFin: formData.dateFin,
                issuanceDate: formData.issuanceDate,
                ville: formData.ville,
                departement: formData.departement,
                civilite: formData.civilite,
            });
        }
    };

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Génération d'Attestations"
                description="Générez des attestations de travail ou de stage personnalisées"
            />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Paramètres de l'attestation
                        </CardTitle>
                        <CardDescription>
                            Configurez les détails du document à générer
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="employee">Employé / Stagiaire *</Label>
                            <Select
                                value={formData.employeeId}
                                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                            >
                                <SelectTrigger id="employee">
                                    <SelectValue placeholder="Sélectionner une personne" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.code} - {emp.nom} {emp.prenom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Type de document *</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: 'TRAVAIL' | 'STAGE') => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger id="type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TRAVAIL">Attestation de Travail</SelectItem>
                                    <SelectItem value="STAGE">Attestation de Stage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'TRAVAIL' && (
                            <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                    <Label>Est actuellement en poste</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Modifie le texte pour indiquer que l'employé est toujours dans la société
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.isCurrent}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isCurrent: checked })}
                                />
                            </div>
                        )}

                        {formData.type === 'TRAVAIL' && !formData.isCurrent && (
                            <div className="space-y-2">
                                <Label htmlFor="dateFinWork">Date de fin de mission *</Label>
                                <Input
                                    id="dateFinWork"
                                    type="date"
                                    value={formData.dateFin}
                                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                                />
                            </div>
                        )}

                        {formData.type === 'STAGE' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dateDebut">Date de début *</Label>
                                    <Input
                                        id="dateDebut"
                                        type="date"
                                        value={formData.dateDebut}
                                        onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateFin">Date de fin *</Label>
                                    <Input
                                        id="dateFin"
                                        type="date"
                                        value={formData.dateFin}
                                        onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="departement">Département</Label>
                                <Input
                                    id="departement"
                                    placeholder="ex: Production, Informatique"
                                    value={formData.departement}
                                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ville">Ville (Lieu de signature)</Label>
                                <Input
                                    id="ville"
                                    placeholder={company?.ville || "Sfax"}
                                    value={formData.ville}
                                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="civilite">Civilité *</Label>
                            <Select
                                value={formData.civilite}
                                onValueChange={(value) => setFormData({ ...formData, civilite: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir la civilité" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Monsieur">Monsieur</SelectItem>
                                    <SelectItem value="Madame">Madame</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issuanceDate">Date de délivrance</Label>
                            <Input
                                id="issuanceDate"
                                type="date"
                                value={formData.issuanceDate}
                                onChange={(e) => setFormData({ ...formData, issuanceDate: e.target.value })}
                            />
                        </div>

                        <Button
                            className="w-full shadow-primary"
                            size="lg"
                            disabled={isGenerating || !formData.employeeId}
                            onClick={handleGenerate}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Génération en cours...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-5 w-5" />
                                    Générer le PDF
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Preview Card */}
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Récapitulatif
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedEmployee ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 rounded-lg bg-background p-4 border">
                                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <UserPlus className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{selectedEmployee.nom} {selectedEmployee.prenom}</h4>
                                        <p className="text-sm text-muted-foreground">{selectedEmployee.poste}</p>
                                        <p className="text-xs text-muted-foreground mt-1">CIN: {selectedEmployee.cin}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg bg-background p-3 border">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase font-bold">
                                            <MapPin className="h-3 w-3" /> Lieu
                                        </div>
                                        <p className="text-sm font-medium">{formData.ville || company?.ville || 'Sfax'}</p>
                                    </div>
                                    <div className="rounded-lg bg-background p-3 border">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase font-bold">
                                            <Calendar className="h-3 w-3" /> Date
                                        </div>
                                        <p className="text-sm font-medium">{formData.issuanceDate}</p>
                                    </div>
                                </div>

                                {formData.departement && (
                                    <div className="rounded-lg bg-background p-3 border">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 uppercase font-bold">
                                            <Building className="h-3 w-3" /> Département
                                        </div>
                                        <p className="text-sm font-medium">{formData.departement}</p>
                                    </div>
                                )}

                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                    <p className="text-xs text-primary font-bold uppercase mb-2">Aperçu du texte :</p>
                                    <p className="text-sm italic text-muted-foreground leading-relaxed">
                                        "Nous, {company?.nom || '...'}, attestons par la présente que {selectedEmployee.nom} {selectedEmployee.prenom}, titulaire du CIN n° {selectedEmployee.cin}, {formData.type === 'TRAVAIL'
                                            ? (formData.isCurrent ? 'occupe actuellement le poste de ' : 'a effectué une mission du ' + (employeeHireDate) + ' au ' + (formData.dateFin || '...') + ' en tant que ')
                                            : 'a effectué un stage du ' + (formData.dateDebut || '...') + ' au ' + (formData.dateFin || '...') + ' en tant que '
                                        }{selectedEmployee.poste}..."
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-64 flex-col items-center justify-center text-center p-8 border-2 border-dashed border-muted rounded-xl">
                                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground">Aucune sélection</h3>
                                <p className="text-sm text-muted-foreground/60 max-w-[250px]">
                                    Sélectionnez un employé pour voir le récapitulatif de l'attestation.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
