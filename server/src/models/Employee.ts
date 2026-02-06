import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Salary } from './Salary';

@Table({
    tableName: 'employees',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
})
export class Employee extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    code!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    nom!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    prenom!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    cin!: string;

    @Column({
        type: DataType.ENUM('CDI', 'CDD', 'STAGE', 'FREELANCE', 'INTERIM', 'SIVP', 'VERBAL'),
        allowNull: false,
    })
    type_contrat!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    service!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    poste!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    date_embauche!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: 'tunisienne',
    })
    nationalite!: string;

    @Column({
        type: DataType.ENUM('CIN', 'Passeport'),
        allowNull: true,
        defaultValue: 'CIN',
    })
    id_type!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    id_date!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    id_place!: string;

    @HasMany(() => Salary)
    salaries!: Salary[];
}
