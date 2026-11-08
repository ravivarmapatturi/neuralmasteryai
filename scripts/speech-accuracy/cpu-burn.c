#include <stdint.h>
int main(void) { volatile uint64_t x=1; for (;;) x=x*6364136223846793005ULL+1; }
