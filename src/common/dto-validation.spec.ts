import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAvailabilityDto } from '../availability/dto/create-availability.dto';
import { RespondDto } from '../sessions/dto/respond.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

const errorsFor = async <T extends object>(cls: new () => T, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map(e => e.property);

describe('DTO validation', () => {
  it('accepts timestamps with an explicit offset', async () => {
    const base = { userId: 'u1', startAt: '2026-11-20T16:00:00+01:00', endAt: '2026-11-20T17:00:00Z' };
    expect(await errorsFor(CreateAvailabilityDto, base)).toEqual([]);
  });

  it('refuses timestamps without an offset', async () => {
    const plain = { userId: 'u1', startAt: '2026-11-20T16:00:00', endAt: '2026-11-20' };
    expect(await errorsFor(CreateAvailabilityDto, plain)).toEqual(['startAt', 'endAt']);
  });

  it('refuses an unknown availability status', async () => {
    const plain = {
      userId: 'u1',
      startAt: '2026-11-20T16:00:00Z',
      endAt: '2026-11-20T17:00:00Z',
      status: 'MAYBE',
    };
    expect(await errorsFor(CreateAvailabilityDto, plain)).toEqual(['status']);
  });

  it('only allows ACCEPTED or REJECTED as a response', async () => {
    expect(await errorsFor(RespondDto, { userId: 'u1', response: 'ACCEPTED' })).toEqual([]);
    expect(await errorsFor(RespondDto, { userId: 'u1', response: 'PENDING' })).toEqual(['response']);
  });

  it('validates user email, phone and timezone', async () => {
    const good = { name: 'Afonso', email: 'a@example.com', phone: '+36201234567', timezone: 'Europe/Budapest' };
    expect(await errorsFor(CreateUserDto, good)).toEqual([]);

    const bad = { name: 'A', email: 'nope', phone: '0620 123', timezone: 'Mars/Olympus' };
    expect(await errorsFor(CreateUserDto, bad)).toEqual(['name', 'email', 'phone', 'timezone']);
  });
});
