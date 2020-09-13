import { DatePickerView } from '@material-ui/pickers';
import dayjs from 'dayjs';

import { PropertyDescriptor } from './PropertyDescriptor';
import { KeysOfType } from './Types';

export type MomentPropertyDescriptorConfig = {
	startSelectingWith: DatePickerView;
	allowFuture: boolean;
	allowPast: boolean;
};

export abstract class BaseMomentPropertyDescriptor<TModel, TValue extends dayjs.Dayjs | null, TProperty extends KeysOfType<TModel, TValue>>
	extends PropertyDescriptor<TModel, TValue, TProperty, dayjs.Dayjs | null, MomentPropertyDescriptorConfig>
{
	constructor(propertyName: TProperty, displayName: string) {
		super(propertyName, displayName, { startSelectingWith: 'day' as DatePickerView, allowFuture: true, allowPast: true });
	}

	protected convertToDisplayable = (value: dayjs.Dayjs | null) => value;

	notNullOrNaN = () => {

		this.addValidator(val => (val === null) ? 'Дата не задана' : null);
		this.addValidator(val => {
			if (!val) {
				return 'Дата не введена';
			}

			return (val.toString() === 'Invalid Date') ? 'Неверная дата' : null;
		});

		return this;
	};

	notAllowedFuture = () => {
		this.addValidator(val => (!this.config.allowFuture && (+val > new Date().getFullYear())) ? 'Поле Дата рождения не может быть заполнено датой из будующего' : null)
	};

	public startSelectingWith = (what: DatePickerView) => {
		this.config.startSelectingWith = what;
		return this;
	};

	public allowFuture = (can: boolean) => {
		this.config.allowFuture = can;
		return this;
	};
}

export class MomentPropertyDescriptor<TModel, TProperty extends KeysOfType<TModel, dayjs.Dayjs>>
	extends BaseMomentPropertyDescriptor<TModel, dayjs.Dayjs, TProperty> {
	protected convertToValue = (value: dayjs.Dayjs | null) => value || dayjs();
}

export class MaybeMomentPropertyDescriptor<TModel, TProperty extends KeysOfType<TModel, dayjs.Dayjs | null>>
	extends BaseMomentPropertyDescriptor<TModel, dayjs.Dayjs | null, TProperty> {
	protected convertToValue = (value: dayjs.Dayjs) => value;
	public isRequired = false;
}
