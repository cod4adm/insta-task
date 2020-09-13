import { CommonStore } from '@Layout';
import { ApplicationApiControllerProxy, ICreateApplication, IUiBlockDescriptionView, UserRole } from '@Shared/Contracts';
import { HttpService } from '@Shared/HttpService';
import { SchemeBuilder } from '@Shared/Validation/SchemeBuilder';
import { EmptyObject, StringMap } from '@Shared/Validation/Types';
import { ContextFor } from '@Shared/Validation/ValidationContext';
import dayjs from 'dayjs';
import { computed, observable } from 'mobx';
import { ApplicationHolder } from '../Types';


export class PersonalDataStore {
	private readonly service = new ApplicationApiControllerProxy(new HttpService());

	constructor(
		private nationalities: StringMap<string, string>,
		private enrolleeId: string,
		uiBlockDescriptions: IUiBlockDescriptionView[],
		private applicationHolder: ApplicationHolder
	) {
		const input = uiBlockDescriptions.filter(x => x.blockId === this.id);

		if (!input || !input.length) {
			this.blockDescription = '';
		} else {
			this.blockDescription = input[0].description;
		}
	}

	@computed
	public get isCompatriot() {
		const application = this.applicationHolder.applicationState;

		if(application) {
			return application.isCompatriot;
		}

		return false;
	}

	public set isCompatriot(value: boolean) {
		const application = this.applicationHolder.applicationState;

		if(application) {
			application.isCompatriot = value;
		}
	}

	@computed
	public get isResident() {
		const application = this.applicationHolder.applicationState;

		if(application) {
			return application.isResident;
		}

		return false;
	}

	public set isResident(value: boolean) {
		const application = this.applicationHolder.applicationState;

		if(application) {
			application.isResident = value;
		}
	}

	public blockDescription: string;

	@computed
	public get id() {
		return 'personal-data-block-id';
	}

	@computed
	public get application() {
		return this.applicationHolder.applicationState;
	}
	@computed
	public get isReadonly() {
		return this.applicationHolder.isReadonly;
	}

	@observable
	public basic: ContextFor<PersonalDataStore['createApplicationScheme']> | null = null;

	public createApplicationScheme = SchemeBuilder.for<ICreateApplication>()
		.nested('applicantName', 'Имя', b => b
			.string('lastName', 'Фамилия', p => p.notWhitespace())
			.string('firstName', 'Имя', p => p.notNullOrEmpty().notWhitespace())
			.maybeString('middleName', 'Отчество', p => p.notWhitespace().default(null))
		)
		.moment('birthDate', 'Дата рождения', b => b
			.allowFuture(false)
			.startSelectingWith('year')
			.notNullOrNaN()
			.notAllowedFuture()
		)
		.select('nationality', 'Гражданство', () => this.nationalities, prop => prop.default('RU'));

	@computed
	public get initialCreateApplication() {
		if (this.application?.applicantName) {
			return {
				enrollee: this.enrolleeId,
				applicantName: this.application.applicantName,
				birthDate: this.application.birthDate,
				id: this.application.id,
				nationality: this.application.nationality,
				isCompatriot: false,
				isResident: false
			};
		}

		const { user } = CommonStore.instance;

		if(user && user.role === UserRole.Enrollee) {
			return {
				enrollee: this.enrolleeId,
				applicantName: user.name,
				birthDate: dayjs(),
				id: '',
				nationality: 'RU',
				isCompatriot: false,
				isResident: false
			};
		}

		return EmptyObject.instance;
	}

	@computed
	public get canBeCompatriotOrResident() {
		return this.basic && this.basic.isValid && this.basic.state.nationality && this.basic.state.nationality !== 'RU';
	}

	@computed
	public get isValid() {
		return !!this.basic && this.basic.isValid && this.basic.scheme.birthDate.modelValue.isValid() && !!this.basic.state.nationality;
	}

	@computed
	public get footerText() {
		return this.isValid
			? 'Нажмите здесь, чтобы сохранить'
			: 'Заполните данные формы';
	}

	@observable
	public expanded = false;

	public tryCreateOrUpdate = () => {
		if(this.expanded && !this.isValid) {
			return;
		}
		this.expanded = !this.expanded;
		if(this.expanded) {
			return;
		}

		const basic = this.basic;

		if (!basic || !basic.isValid) {
			return;
		}

		const { firstName, middleName, lastName } = basic.scheme.applicantName.scheme;
		const { birthDate, nationality } = basic.scheme;
		const nationalityValue = nationality.modelValue;

		const creating = !(this.application?.id);

		const cmd: ICreateApplication = {
			id: this.application?.id || null,
			enrollee: this.enrolleeId,
			applicantName: {
				firstName: firstName.modelValue.trim(),
				middleName: middleName.modelValue?.trim() || null,
				lastName: lastName.modelValue.trim(),
				fullForm: '',
				shortOfficialForm: ''
			},
			birthDate: birthDate.modelValue,
			nationality: nationalityValue,
			isCompatriot: nationalityValue === 'RU' ? false : this.isCompatriot,
			isResident: nationalityValue === 'RU' ? false : this.isResident
		};

		this.service
			.create(cmd)
			.then(CommonStore.instance.handleError)
			.then((app) => creating ? this.applicationHolder.onCreate(app) : this.applicationHolder.setApplication(app));
	};
}
