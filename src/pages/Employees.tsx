import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttestations } from '@/hooks/useAttestations';
import { CONTRACT_TYPES, formatShortDate } from '@/lib/constants';
import type { Employee, EmployeeFormData, ContractType } from '@/types/database';
import { Plus, Pencil, Trash2, Loader2, Users, FileText, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Employees() {
  const { employees, isLoading, createEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { generateWorkCertificate, generateInternshipCertificate, isGenerating } = useAttestations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<EmployeeFormData>({
    nom: '',
    prenom: '',
    cin: '',
    type_contrat: 'CDI',
    service: '',
    poste: '',
    nationalite: 'tunisienne',
    id_type: 'CIN',
    id_date: '',
    id_place: '',
    date_embauche: new Date().toISOString().split('T')[0],
  });

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      cin: '',
      type_contrat: 'CDI',
      service: '',
      poste: '',
      nationalite: 'tunisienne',
      id_type: 'CIN',
      id_date: '',
      id_place: '',
      date_embauche: new Date().toISOString().split('T')[0],
    });
    setSelectedEmployee(null);
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({
        nom: employee.nom,
        prenom: employee.prenom,
        cin: employee.cin,
        type_contrat: employee.type_contrat,
        service: employee.service || '',
        poste: employee.poste,
        nationalite: employee.nationalite || 'tunisienne',
        id_type: employee.id_type || 'CIN',
        id_date: employee.id_date || '',
        id_place: employee.id_place || '',
        date_embauche: employee.date_embauche.split('T')[0],
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmployee) {
      await updateEmployee.mutateAsync({ id: selectedEmployee.id, ...formData });
    } else {
      await createEmployee.mutateAsync(formData);
    }

    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (employeeToDelete) {
      await deleteEmployee.mutateAsync(employeeToDelete.id);
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Gestion des Employés"
        description="Gérez les informations de vos employés"
        actions={
          <Button onClick={() => handleOpenDialog()} className="shadow-primary">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un employé
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Aucun employé</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Commencez par ajouter votre premier employé
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead>Type Contrat</TableHead>
                <TableHead>Nationalité</TableHead>
                <TableHead>Date d'embauche</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="animate-fade-in">
                  <TableCell className="font-mono font-semibold text-primary">
                    {employee.code}
                  </TableCell>
                  <TableCell className="font-medium">{employee.nom}</TableCell>
                  <TableCell>{employee.prenom}</TableCell>
                  <TableCell className="font-mono">{employee.cin}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {employee.type_contrat}
                    </span>
                  </TableCell>
                  <TableCell>{employee.poste}</TableCell>
                  <TableCell>{employee.nationalite}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{employee.id_type}</span>
                      <span className="font-mono">{employee.cin}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatShortDate(employee.date_embauche)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog Ajout/Modification */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? 'Modifier l\'employé' : 'Ajouter un employé'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? `Modification de ${selectedEmployee.code}`
                : 'Le code employé sera généré automatiquement'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cin">CIN *</Label>
                <Input
                  id="cin"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_contrat">Type de contrat *</Label>
                <Select
                  value={formData.type_contrat}
                  onValueChange={(value: ContractType) =>
                    setFormData({ ...formData, type_contrat: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poste">Poste *</Label>
                <Input
                  id="poste"
                  value={formData.poste}
                  onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationalite">Nationalité *</Label>
                <Input
                  id="nationalite"
                  value={formData.nationalite}
                  onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                  placeholder="par ex. tunisienne"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_type">Type de document *</Label>
                <Select
                  value={formData.id_type}
                  onValueChange={(value: 'CIN' | 'Passeport') =>
                    setFormData({ ...formData, id_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIN">CIN</SelectItem>
                    <SelectItem value="Passeport">Passeport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin">Numéro du document *</Label>
                <Input
                  id="cin"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  placeholder={formData.id_type === 'CIN' ? "Numéro de CIN" : "Numéro de Passeport"}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_date">Date de délivrance</Label>
                <Input
                  id="id_date"
                  type="date"
                  value={formData.id_date}
                  onChange={(e) => setFormData({ ...formData, id_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_place">Lieu de délivrance</Label>
                <Input
                  id="id_place"
                  value={formData.id_place}
                  onChange={(e) => setFormData({ ...formData, id_place: e.target.value })}
                  placeholder="Lieu de délivrance"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_embauche">Date d'embauche *</Label>
              <Input
                id="date_embauche"
                type="date"
                value={formData.date_embauche}
                onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedEmployee ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'employé{' '}
              <strong>
                {employeeToDelete?.code} - {employeeToDelete?.nom} {employeeToDelete?.prenom}
              </strong>
              ? Cette action est irréversible et supprimera également tous les salaires associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
